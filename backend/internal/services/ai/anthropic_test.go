package ai

import (
	"testing"
)

func TestConvertToAnthropicRequest_ToolChoice(t *testing.T) {
	provider := &AnthropicProvider{
		config: ProviderConfig{
			Model: "claude-3-5-sonnet-20241022",
		},
	}

	tests := []struct {
		name           string
		toolChoice     *ToolChoice
		expectedChoice *map[string]interface{}
	}{
		{
			name:           "nil tool choice",
			toolChoice:     nil,
			expectedChoice: nil,
		},
		{
			name: "none tool choice",
			toolChoice: &ToolChoice{
				Type: "none",
			},
			expectedChoice: &map[string]interface{}{
				"type": "none",
			},
		},
		{
			name: "auto tool choice",
			toolChoice: &ToolChoice{
				Type: "auto",
			},
			expectedChoice: &map[string]interface{}{
				"type": "auto",
			},
		},
		{
			name: "any tool choice",
			toolChoice: &ToolChoice{
				Type: "any",
			},
			expectedChoice: &map[string]interface{}{
				"type": "any",
			},
		},
		{
			name: "specific tool choice",
			toolChoice: &ToolChoice{
				Type: "tool",
				Name: "read_range",
			},
			expectedChoice: &map[string]interface{}{
				"type": "tool",
				"name": "read_range",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := CompletionRequest{
				Messages: []Message{
					{Role: "user", Content: "test"},
				},
				ToolChoice: tt.toolChoice,
			}

			anthropicReq := provider.convertToAnthropicRequest(request)

			if tt.expectedChoice == nil {
				if anthropicReq.ToolChoice != nil {
					t.Errorf("Expected nil tool choice, got %v", anthropicReq.ToolChoice)
				}
			} else {
				if anthropicReq.ToolChoice == nil {
					t.Errorf("Expected tool choice %v, got nil", tt.expectedChoice)
				} else {
					// Compare the maps
					expected := *tt.expectedChoice
					actual := *anthropicReq.ToolChoice
					
					if expected["type"] != actual["type"] {
						t.Errorf("Expected type %v, got %v", expected["type"], actual["type"])
					}
					
					if expected["type"] == "tool" {
						if expected["name"] != actual["name"] {
							t.Errorf("Expected name %v, got %v", expected["name"], actual["name"])
						}
					}
				}
			}
		})
	}
}

func TestDetectSpecificToolRequest(t *testing.T) {
	service := &Service{}

	tests := []struct {
		name         string
		userMessage  string
		expectedTool string
	}{
		{
			name:         "read range request",
			userMessage:  "Please read the range A1:B10",
			expectedTool: "read_range",
		},
		{
			name:         "write value request",
			userMessage:  "Write the value 100 to cell A1",
			expectedTool: "write_range",
		},
		{
			name:         "create formula request",
			userMessage:  "Create a SUM formula in cell C1",
			expectedTool: "write_formula",
		},
		{
			name:         "apply formatting request",
			userMessage:  "Apply bold formatting to range A1:A10",
			expectedTool: "apply_formatting",
		},
		{
			name:         "create chart request",
			userMessage:  "Create a bar chart from the data",
			expectedTool: "create_chart",
		},
		{
			name:         "no specific tool",
			userMessage:  "What is the total revenue?",
			expectedTool: "",
		},
		{
			name:         "conditional formatting",
			userMessage:  "Apply conditional formatting to highlight values above 100",
			expectedTool: "apply_conditional_formatting",
		},
		{
			name:         "create pivot table",
			userMessage:  "Generate a pivot table from the sales data",
			expectedTool: "create_pivot_table",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.detectSpecificToolRequest(tt.userMessage)
			if result != tt.expectedTool {
				t.Errorf("Expected tool %q, got %q for message: %q", tt.expectedTool, result, tt.userMessage)
			}
		})
	}
}