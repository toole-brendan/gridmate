package ai

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// MockProvider implements the AIProvider interface for development testing
type MockProvider struct {
	config ProviderConfig
}

// NewMockProvider creates a new mock provider
func NewMockProvider(config ProviderConfig) *MockProvider {
	return &MockProvider{
		config: config,
	}
}

// GetProviderName returns the provider name
func (m *MockProvider) GetProviderName() string {
	return "mock"
}

// GetCompletion returns a mock completion
func (m *MockProvider) GetCompletion(ctx context.Context, request CompletionRequest) (*CompletionResponse, error) {
	// Simulate some processing time
	time.Sleep(100 * time.Millisecond)
	
	// Generate a mock response based on the last user message
	var lastUserMessage string
	for i := len(request.Messages) - 1; i >= 0; i-- {
		if request.Messages[i].Role == "user" {
			lastUserMessage = request.Messages[i].Content
			break
		}
	}
	
	response := &CompletionResponse{
		ID:      fmt.Sprintf("mock_%d", time.Now().Unix()),
		Model:   "mock-model",
		Content: fmt.Sprintf("This is a mock response to: %s\n\nI'll help you create a DCF model with mock data.", lastUserMessage),
		Usage: Usage{
			InputTokens:  100,
			OutputTokens: 50,
			TotalTokens:  150,
		},
	}
	
	// If tools are requested, add some mock tool calls
	if len(request.Tools) > 0 && strings.Contains(lastUserMessage, "DCF") {
		response.ToolCalls = []ToolCall{
			{
				ID:   "mock_tool_1",
				Type: "function",
				Function: FunctionCall{
					Name: "write_range",
					Arguments: `{"range": "A1:A10", "values": [["DCF Model"], ["Revenue"], ["Growth Rate"], ["EBITDA"], ["Tax Rate"], ["CAPEX"], ["Working Capital"], ["Terminal Value"], ["NPV"], [""]]}`,
				},
			},
		}
	}
	
	return response, nil
}

// GetStreamingCompletion returns a mock streaming completion
func (m *MockProvider) GetStreamingCompletion(ctx context.Context, request CompletionRequest) (<-chan CompletionChunk, error) {
	chunks := make(chan CompletionChunk)
	
	// Get the last user message
	var lastUserMessage string
	for i := len(request.Messages) - 1; i >= 0; i-- {
		if request.Messages[i].Role == "user" {
			lastUserMessage = request.Messages[i].Content
			break
		}
	}
	
	go func() {
		defer close(chunks)
		
		// Simulate streaming response
		messages := []string{
			"I'll help you create ",
			"a DCF (Discounted Cash Flow) model ",
			"with mock data. ",
			"Let me set up the structure first.\n\n",
		}
		
		for i, msg := range messages {
			select {
			case <-ctx.Done():
				return
			case chunks <- CompletionChunk{
				ID:    fmt.Sprintf("chunk_%d", i),
				Type:  "text",
				Delta: msg,
				Done:  false,
			}:
				time.Sleep(50 * time.Millisecond) // Simulate typing delay
			}
		}
		
		// If tools are available and DCF is mentioned, simulate tool usage
		if len(request.Tools) > 0 && strings.Contains(lastUserMessage, "DCF") {
			// Tool start
			chunks <- CompletionChunk{
				ID:   "tool_start_1",
				Type: "tool_start",
				ToolCall: &ToolCall{
					ID:   "mock_tool_1",
					Type: "function",
					Function: FunctionCall{
						Name: "write_range",
					},
				},
				Done: false,
			}
			
			time.Sleep(100 * time.Millisecond)
			
			// Tool progress
			chunks <- CompletionChunk{
				ID:    "tool_progress_1",
				Type:  "tool_progress",
				Delta: "Writing DCF structure to cells...",
				Done:  false,
			}
			
			time.Sleep(200 * time.Millisecond)
			
			// Tool complete
			chunks <- CompletionChunk{
				ID:   "tool_complete_1",
				Type: "tool_complete",
				ToolCall: &ToolCall{
					ID: "mock_tool_1",
				},
				Done: false,
			}
			
			// Continue with text
			finalMessages := []string{
				"\nI've created the basic structure. ",
				"Now let me add some mock financial data ",
				"to demonstrate the model.",
			}
			
			for i, msg := range finalMessages {
				chunks <- CompletionChunk{
					ID:    fmt.Sprintf("chunk_final_%d", i),
					Type:  "text",
					Delta: msg,
					Done:  false,
				}
				time.Sleep(50 * time.Millisecond)
			}
		}
		
		// Send done chunk
		chunks <- CompletionChunk{
			ID:   "done",
			Type: "done",
			Done: true,
		}
	}()
	
	return chunks, nil
}

// GetEmbedding returns mock embeddings
func (m *MockProvider) GetEmbedding(ctx context.Context, text string) ([]float32, error) {
	// Return a mock embedding vector
	embedding := make([]float32, 1536) // Standard embedding size
	for i := range embedding {
		embedding[i] = float32(i) / 1536.0 // Simple pattern
	}
	return embedding, nil
}

// IsHealthy always returns true for mock provider
func (m *MockProvider) IsHealthy(ctx context.Context) error {
	return nil
}