package ai

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestCategorizeError(t *testing.T) {
	te := &ToolExecutor{}
	toolCall := ToolCall{
		ID:   "test-123",
		Name: "read_range",
		Input: map[string]interface{}{
			"range": "A1:B10",
		},
	}

	tests := []struct {
		name              string
		err               error
		expectedType      ToolErrorType
		expectedRetryable bool
		hasRetryAfter     bool
	}{
		{
			name:              "context deadline exceeded",
			err:               context.DeadlineExceeded,
			expectedType:      ToolErrorTypeTimeout,
			expectedRetryable: true,
			hasRetryAfter:     true,
		},
		{
			name:              "permission denied",
			err:               errors.New("permission denied to access workbook"),
			expectedType:      ToolErrorTypePermission,
			expectedRetryable: false,
			hasRetryAfter:     false,
		},
		{
			name:              "access denied",
			err:               errors.New("access denied"),
			expectedType:      ToolErrorTypePermission,
			expectedRetryable: false,
			hasRetryAfter:     false,
		},
		{
			name:              "rate limit error",
			err:               errors.New("rate limit exceeded"),
			expectedType:      ToolErrorTypeRateLimit,
			expectedRetryable: true,
			hasRetryAfter:     true,
		},
		{
			name:              "too many requests",
			err:               errors.New("too many requests"),
			expectedType:      ToolErrorTypeRateLimit,
			expectedRetryable: true,
			hasRetryAfter:     true,
		},
		{
			name:              "invalid input",
			err:               errors.New("invalid range format"),
			expectedType:      ToolErrorTypeInvalidInput,
			expectedRetryable: false,
			hasRetryAfter:     false,
		},
		{
			name:              "bad request",
			err:               errors.New("bad request: missing parameter"),
			expectedType:      ToolErrorTypeInvalidInput,
			expectedRetryable: false,
			hasRetryAfter:     false,
		},
		{
			name:              "generic error",
			err:               errors.New("something went wrong"),
			expectedType:      ToolErrorTypeExecutionError,
			expectedRetryable: true,
			hasRetryAfter:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := te.categorizeError(tt.err, toolCall)

			if result.Type != tt.expectedType {
				t.Errorf("Expected error type %v, got %v", tt.expectedType, result.Type)
			}

			if result.Retryable != tt.expectedRetryable {
				t.Errorf("Expected retryable %v, got %v", tt.expectedRetryable, result.Retryable)
			}

			if tt.hasRetryAfter && result.RetryAfter == nil {
				t.Error("Expected RetryAfter to be set, but it was nil")
			}

			if !tt.hasRetryAfter && result.RetryAfter != nil {
				t.Error("Expected RetryAfter to be nil, but it was set")
			}

			if result.ToolName != toolCall.Name {
				t.Errorf("Expected tool name %v, got %v", toolCall.Name, result.ToolName)
			}

			if result.ToolID != toolCall.ID {
				t.Errorf("Expected tool ID %v, got %v", toolCall.ID, result.ToolID)
			}
		})
	}
}

func TestExecuteToolWithTimeout(t *testing.T) {
	// Create a mock ExcelBridge that simulates a slow operation
	mockBridge := &mockExcelBridge{
		readDelay: 35 * time.Second, // Longer than our 30s timeout
	}

	te := &ToolExecutor{
		excelBridge: mockBridge,
	}

	toolCall := ToolCall{
		ID:   "test-timeout",
		Name: "read_range",
		Input: map[string]interface{}{
			"range": "A1:B10",
		},
	}

	ctx := context.Background()
	result, err := te.ExecuteTool(ctx, "test-session", toolCall, "auto")

	if err != nil {
		t.Errorf("ExecuteTool should not return error, got: %v", err)
	}

	if result == nil {
		t.Fatal("Expected result, got nil")
	}

	if !result.IsError {
		t.Error("Expected error result due to timeout")
	}

	if result.Status != "error" {
		t.Errorf("Expected status 'error', got %v", result.Status)
	}

	// Check that the error content is a ToolError
	toolErr, ok := result.Content.(*ToolError)
	if !ok {
		t.Fatalf("Expected ToolError content, got %T", result.Content)
	}

	if toolErr.Type != ToolErrorTypeTimeout {
		t.Errorf("Expected timeout error type, got %v", toolErr.Type)
	}
}

// mockExcelBridge is a mock implementation of ExcelBridge for testing
type mockExcelBridge struct {
	readDelay time.Duration
}

func (m *mockExcelBridge) ReadRange(ctx context.Context, sessionID string, rangeAddr string, includeFormulas, includeFormatting bool) (*RangeData, error) {
	select {
	case <-time.After(m.readDelay):
		return &RangeData{}, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func (m *mockExcelBridge) WriteRange(ctx context.Context, sessionID string, rangeAddr string, values [][]interface{}, preserveFormatting bool) error {
	return nil
}

func (m *mockExcelBridge) ApplyFormula(ctx context.Context, sessionID string, rangeAddr string, formula string, relativeRefs bool) error {
	return nil
}

func (m *mockExcelBridge) AnalyzeData(ctx context.Context, sessionID string, rangeAddr string, includeStats, detectHeaders bool) (*DataAnalysis, error) {
	return nil, nil
}

func (m *mockExcelBridge) FormatRange(ctx context.Context, sessionID string, rangeAddr string, format *CellFormat) error {
	return nil
}

func (m *mockExcelBridge) CreateChart(ctx context.Context, sessionID string, config *ChartConfig) error {
	return nil
}

func (m *mockExcelBridge) ValidateModel(ctx context.Context, sessionID string, rangeAddr string, checks *ValidationChecks) (*ValidationResult, error) {
	return nil, nil
}