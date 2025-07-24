package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

const (
	AnthropicBaseURL    = "https://api.anthropic.com"
	AnthropicAPIVersion = "2023-06-01"
	DefaultModel        = "claude-3-5-sonnet-20241022"
)

func init() {
	// Initialize random number generator for jitter
	rand.Seed(time.Now().UnixNano())
}

// AnthropicProvider implements the AIProvider interface for Anthropic Claude
type AnthropicProvider struct {
	config ProviderConfig
	client *http.Client
}

// NewAnthropicProvider creates a new Anthropic provider
func NewAnthropicProvider(config ProviderConfig) *AnthropicProvider {
	if config.Model == "" {
		config.Model = DefaultModel
	}
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}
	if config.MaxRetries == 0 {
		config.MaxRetries = 3
	}
	if config.RetryDelay == 0 {
		config.RetryDelay = 2 * time.Second // Use a default if not set
	}

	return &AnthropicProvider{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// GetProviderName returns the provider name
func (a *AnthropicProvider) GetProviderName() string {
	return "anthropic"
}

// IsHealthy checks if the Anthropic API is accessible
func (a *AnthropicProvider) IsHealthy(ctx context.Context) error {
	// Simple health check by making a minimal request
	request := CompletionRequest{
		Messages: []Message{
			{Role: "user", Content: "Hi"},
		},
		MaxTokens: 5,
	}

	_, err := a.GetCompletion(ctx, request)
	return err
}

// GetCompletion gets a completion from Anthropic
func (a *AnthropicProvider) GetCompletion(ctx context.Context, request CompletionRequest) (*CompletionResponse, error) {
	anthropicRequest := a.convertToAnthropicRequest(request)

	var lastErr error
	for attempt := 0; attempt <= a.config.MaxRetries; attempt++ {
		if attempt > 0 {
			// Calculate exponential backoff with jitter
			baseDelay := a.config.RetryDelay
			if baseDelay == 0 {
				baseDelay = 1 * time.Second
			}

			// Exponential backoff: baseDelay * 2^(attempt-1)
			backoffDelay := time.Duration(float64(baseDelay) * math.Pow(2, float64(attempt-1)))

			// Cap the maximum delay to 60 seconds
			maxDelay := 60 * time.Second
			if backoffDelay > maxDelay {
				backoffDelay = maxDelay
			}

			// Add jitter: randomize between 0.5x and 1.5x of the backoff delay
			jitterMultiplier := 0.5 + rand.Float64() // 0.5 to 1.5
			delayWithJitter := time.Duration(float64(backoffDelay) * jitterMultiplier)

			// Check if we have a Retry-After value from the previous error
			if aiErr, ok := lastErr.(*AIError); ok && aiErr.RetryAfter > 0 {
				// Use the server-specified retry delay
				delayWithJitter = time.Duration(aiErr.RetryAfter) * time.Second
				log.Debug().
					Int("retry_after_seconds", aiErr.RetryAfter).
					Int("attempt", attempt).
					Msg("Using Retry-After header value from server")
			}

			log.Debug().
				Int("attempt", attempt).
				Dur("delay", delayWithJitter).
				Msg("Retrying after delay")

			select {
			case <-time.After(delayWithJitter):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		response, err := a.makeRequest(ctx, anthropicRequest, false)
		if err != nil {
			lastErr = err
			if aiErr, ok := err.(*AIError); ok && !aiErr.IsRetryable() {
				break
			}
			log.Warn().
				Err(err).
				Int("attempt", attempt).
				Int("max_retries", a.config.MaxRetries).
				Msg("Request failed, will retry if attempts remain")
			continue
		}

		return response, nil
	}

	return nil, lastErr
}

// GetStreamingCompletion gets a streaming completion from Anthropic
func (a *AnthropicProvider) GetStreamingCompletion(ctx context.Context, request CompletionRequest) (<-chan CompletionChunk, error) {
	anthropicRequest := a.convertToAnthropicRequest(request)
	anthropicRequest.Stream = true

	ch := make(chan CompletionChunk, 10)

	go func() {
		defer close(ch)

		err := a.makeStreamingRequest(ctx, anthropicRequest, ch)
		if err != nil {
			ch <- CompletionChunk{Error: err, Done: true}
		}
	}()

	return ch, nil
}

// GetEmbedding generates embeddings - Note: Anthropic doesn't provide embeddings directly
// This would need to be implemented using a different service or fallback
func (a *AnthropicProvider) GetEmbedding(ctx context.Context, text string) ([]float32, error) {
	return nil, &AIError{
		Type:    ErrorTypeUnavailable,
		Message: "Anthropic does not provide embedding endpoints. Use Azure OpenAI or another provider for embeddings.",
	}
}

// anthropicRequest represents the request format for Anthropic API
type anthropicRequest struct {
	Model       string                  `json:"model"`
	MaxTokens   int                     `json:"max_tokens"`
	Messages    []anthropicMessage      `json:"messages"`
	Temperature *float32                `json:"temperature,omitempty"`
	TopP        *float32                `json:"top_p,omitempty"`
	Stream      bool                    `json:"stream,omitempty"`
	System      string                  `json:"system,omitempty"`
	Tools       []anthropicTool         `json:"tools,omitempty"`
	ToolChoice  *map[string]interface{} `json:"tool_choice,omitempty"`
}

type anthropicMessage struct {
	Role    string                  `json:"role"`
	Content anthropicMessageContent `json:"content"`
}

type anthropicMessageContent interface{}

type anthropicTextContent string

type anthropicToolContent []anthropicContentBlock

// MarshalJSON implements custom JSON marshaling for anthropicMessage
func (m anthropicMessage) MarshalJSON() ([]byte, error) {
	type Alias anthropicMessage
	switch content := m.Content.(type) {
	case anthropicTextContent:
		return json.Marshal(&struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		}{
			Role:    m.Role,
			Content: string(content),
		})
	case anthropicToolContent:
		return json.Marshal(&struct {
			Role    string                  `json:"role"`
			Content []anthropicContentBlock `json:"content"`
		}{
			Role:    m.Role,
			Content: []anthropicContentBlock(content),
		})
	default:
		return json.Marshal(&struct {
			Alias
		}{
			Alias: (Alias)(m),
		})
	}
}

type anthropicContentBlock struct {
	Type      string                 `json:"type"`
	Text      string                 `json:"text,omitempty"`
	ID        string                 `json:"id,omitempty"`
	Name      string                 `json:"name,omitempty"`
	Input     map[string]interface{} `json:"input,omitempty"`
	Content   interface{}            `json:"content,omitempty"`
	ToolUseID string                 `json:"tool_use_id,omitempty"`
	IsError   bool                   `json:"is_error,omitempty"`
}

type anthropicTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"input_schema"`
}

type anthropicResponse struct {
	ID           string             `json:"id"`
	Type         string             `json:"type"`
	Role         string             `json:"role"`
	Content      []anthropicContent `json:"content"`
	Model        string             `json:"model"`
	StopReason   string             `json:"stop_reason"`
	StopSequence string             `json:"stop_sequence"`
	Usage        anthropicUsage     `json:"usage"`
}

type anthropicContent struct {
	Type  string                 `json:"type"`
	Text  string                 `json:"text,omitempty"`
	ID    string                 `json:"id,omitempty"`
	Name  string                 `json:"name,omitempty"`
	Input map[string]interface{} `json:"input,omitempty"`
}

type anthropicUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type anthropicStreamEvent struct {
	Type         string                 `json:"type"`
	Index        int                    `json:"index,omitempty"`
	Delta        *anthropicDelta        `json:"delta,omitempty"`
	ContentBlock *anthropicContentBlock `json:"content_block,omitempty"`
	Message      *anthropicResponse     `json:"message,omitempty"`
	Usage        *anthropicUsage        `json:"usage,omitempty"`
	Error        *anthropicError        `json:"error,omitempty"`
}

type anthropicDelta struct {
	Type         string `json:"type"`
	Text         string `json:"text"`
	StopReason   string `json:"stop_reason"`
	StopSequence string `json:"stop_sequence"`
}

type anthropicError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// convertToAnthropicRequest converts our generic request to Anthropic format
func (a *AnthropicProvider) convertToAnthropicRequest(request CompletionRequest) *anthropicRequest {
	anthropicReq := &anthropicRequest{
		Model:     a.config.Model,
		MaxTokens: request.MaxTokens,
		Messages:  make([]anthropicMessage, 0),
		Stream:    request.Stream,
	}

	if request.MaxTokens == 0 {
		anthropicReq.MaxTokens = 8192 // Default max tokens, increased for tool sequences
	}

	if request.Temperature > 0 {
		anthropicReq.Temperature = &request.Temperature
	}

	if request.TopP > 0 {
		anthropicReq.TopP = &request.TopP
	}

	// Add tools if provided
	if len(request.Tools) > 0 {
		anthropicReq.Tools = make([]anthropicTool, 0, len(request.Tools))
		for _, tool := range request.Tools {
			anthropicReq.Tools = append(anthropicReq.Tools, anthropicTool{
				Name:        tool.Name,
				Description: tool.Description,
				InputSchema: tool.InputSchema,
			})
		}
	}

	// Convert messages, handling system messages specially
	for _, msg := range request.Messages {
		if msg.Role == "system" {
			anthropicReq.System = msg.Content
		} else if msg.ToolCalls != nil || msg.ToolResults != nil {
			// Handle tool-related messages
			anthropicMsg := anthropicMessage{
				Role: msg.Role,
			}

			var contentBlocks []anthropicContentBlock

			// Add text content if present
			if msg.Content != "" {
				contentBlocks = append(contentBlocks, anthropicContentBlock{
					Type: "text",
					Text: msg.Content,
				})
			}

			// Add tool calls
			for _, toolCall := range msg.ToolCalls {
				contentBlocks = append(contentBlocks, anthropicContentBlock{
					Type:  "tool_use",
					ID:    toolCall.ID,
					Name:  toolCall.Name,
					Input: toolCall.Input,
				})
			}

			// Add tool results
			for _, toolResult := range msg.ToolResults {
				// Convert content to string format for Anthropic
				var content string
				switch v := toolResult.Content.(type) {
				case string:
					content = v
				case map[string]interface{}:
					// Handle error format or other maps
					if errMsg, ok := v["error"].(string); ok && toolResult.IsError {
						content = errMsg
					} else {
						// Convert map to JSON string
						jsonBytes, _ := json.Marshal(v)
						content = string(jsonBytes)
					}
				default:
					// Convert any other type to JSON string
					jsonBytes, _ := json.Marshal(v)
					content = string(jsonBytes)
				}

				contentBlocks = append(contentBlocks, anthropicContentBlock{
					Type:      "tool_result",
					ToolUseID: toolResult.ToolUseID,
					Content:   content,
					IsError:   toolResult.IsError,
				})
			}

			anthropicMsg.Content = anthropicToolContent(contentBlocks)
			anthropicReq.Messages = append(anthropicReq.Messages, anthropicMsg)
		} else {
			// Simple text message
			anthropicReq.Messages = append(anthropicReq.Messages, anthropicMessage{
				Role:    msg.Role,
				Content: anthropicTextContent(msg.Content),
			})
		}
	}

	// Add tool choice conversion
	if request.ToolChoice != nil {
		switch request.ToolChoice.Type {
		case "none":
			anthropicReq.ToolChoice = &map[string]interface{}{"type": "none"}
		case "any":
			anthropicReq.ToolChoice = &map[string]interface{}{"type": "any"}
		case "auto":
			anthropicReq.ToolChoice = &map[string]interface{}{"type": "auto"}
		case "tool":
			anthropicReq.ToolChoice = &map[string]interface{}{
				"type": "tool",
				"name": request.ToolChoice.Name,
			}
		}
	}

	return anthropicReq
}

// makeRequest makes a single request to Anthropic API
func (a *AnthropicProvider) makeRequest(ctx context.Context, request *anthropicRequest, streaming bool) (*CompletionResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, &AIError{
			Type:       ErrorTypeInvalidInput,
			Message:    "Failed to marshal request",
			Underlying: err,
		}
	}

	// Log the request for debugging
	log.Debug().
		Int("tools_count", len(request.Tools)).
		Str("request_json", string(jsonData)).
		Msg("Sending request to Anthropic API")

	req, err := http.NewRequestWithContext(ctx, "POST", AnthropicBaseURL+"/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, &AIError{
			Type:       ErrorTypeServerError,
			Message:    "Failed to create request",
			Underlying: err,
		}
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", a.config.APIKey)
	req.Header.Set("anthropic-version", AnthropicAPIVersion)

	if streaming {
		req.Header.Set("Accept", "text/event-stream")
		req.Header.Set("Cache-Control", "no-cache")
	}

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, a.handleHTTPError(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, a.handleAPIError(resp)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, &AIError{
			Type:       ErrorTypeServerError,
			Message:    "Failed to read response body",
			Underlying: err,
		}
	}

	var anthropicResp anthropicResponse
	if err := json.Unmarshal(body, &anthropicResp); err != nil {
		return nil, &AIError{
			Type:       ErrorTypeServerError,
			Message:    "Failed to parse response",
			Underlying: err,
		}
	}

	return a.convertFromAnthropicResponse(&anthropicResp), nil
}

// makeStreamingRequest makes a streaming request to Anthropic API
func (a *AnthropicProvider) makeStreamingRequest(ctx context.Context, request *anthropicRequest, ch chan<- CompletionChunk) error {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return &AIError{
			Type:       ErrorTypeInvalidInput,
			Message:    "Failed to marshal request",
			Underlying: err,
		}
	}

	req, err := http.NewRequestWithContext(ctx, "POST", AnthropicBaseURL+"/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return &AIError{
			Type:       ErrorTypeServerError,
			Message:    "Failed to create request",
			Underlying: err,
		}
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", a.config.APIKey)
	req.Header.Set("anthropic-version", AnthropicAPIVersion)
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")

	resp, err := a.client.Do(req)
	if err != nil {
		return a.handleHTTPError(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return a.handleAPIError(resp)
	}

	scanner := bufio.NewScanner(resp.Body)
	var messageID string
	var currentToolCall *ToolCall
	var toolInputBuffer strings.Builder

	for scanner.Scan() {
		line := scanner.Text()

		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			ch <- CompletionChunk{ID: messageID, Done: true}
			break
		}

		var event anthropicStreamEvent
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			log.Error().Err(err).Str("data", data).Msg("Failed to parse stream event")
			continue
		}

		switch event.Type {
		case "message_start":
			if event.Message != nil {
				messageID = event.Message.ID
			}
		case "content_block_start":
			if event.ContentBlock != nil && event.ContentBlock.Type == "tool_use" {
				currentToolCall = &ToolCall{
					ID:    event.ContentBlock.ID,
					Name:  event.ContentBlock.Name,
					Input: make(map[string]interface{}),
				}
				toolInputBuffer.Reset()
				ch <- CompletionChunk{
					ID:       messageID,
					Type:     "tool_start",
					ToolCall: currentToolCall,
					Done:     false,
				}
			}
		case "content_block_delta":
			if event.Delta != nil {
				if currentToolCall != nil && event.Delta.Type == "input_json_delta" {
					// Accumulate tool input JSON
					toolInputBuffer.WriteString(event.Delta.Text)
					ch <- CompletionChunk{
						ID:       messageID,
						Type:     "tool_progress",
						ToolCall: currentToolCall,
						Delta:    event.Delta.Text,
						Done:     false,
					}
				} else {
					// Regular text delta
					ch <- CompletionChunk{
						ID:      messageID,
						Type:    "text",
						Delta:   event.Delta.Text,
						Content: "", // Don't send content for deltas
						Done:    false,
					}
				}
			}
		case "content_block_stop":
			if currentToolCall != nil {
				// Parse the accumulated JSON input
				if toolInputBuffer.Len() > 0 {
					if err := json.Unmarshal([]byte(toolInputBuffer.String()), &currentToolCall.Input); err != nil {
						log.Error().Err(err).Str("json", toolInputBuffer.String()).Msg("Failed to parse tool input JSON")
					}
				}
				ch <- CompletionChunk{
					ID:       messageID,
					Type:     "tool_complete",
					ToolCall: currentToolCall,
					Done:     false,
				}
				currentToolCall = nil
			}
		case "message_delta":
			if event.Delta != nil && event.Delta.StopReason != "" {
				ch <- CompletionChunk{ID: messageID, Done: true}
			}
		case "error":
			if event.Error != nil {
				return &AIError{
					Type:    ErrorTypeServerError,
					Message: event.Error.Message,
				}
			}
		}
	}

	return scanner.Err()
}

// convertFromAnthropicResponse converts Anthropic response to our generic format
func (a *AnthropicProvider) convertFromAnthropicResponse(resp *anthropicResponse) *CompletionResponse {
	var content strings.Builder
	var toolCalls []ToolCall

	for _, c := range resp.Content {
		switch c.Type {
		case "text":
			content.WriteString(c.Text)
		case "tool_use":
			toolCalls = append(toolCalls, ToolCall{
				ID:    c.ID,
				Name:  c.Name,
				Input: c.Input,
			})
		}
	}

	response := &CompletionResponse{
		ID:        resp.ID,
		Content:   content.String(),
		Model:     resp.Model,
		ToolCalls: toolCalls,
		Usage: Usage{
			PromptTokens:     resp.Usage.InputTokens,
			CompletionTokens: resp.Usage.OutputTokens,
			TotalTokens:      resp.Usage.InputTokens + resp.Usage.OutputTokens,
		},
		Created: time.Now(),
	}

	// Parse potential actions from the response
	response.Actions = a.parseActionsFromContent(response.Content)

	return response
}

// parseActionsFromContent attempts to parse suggested actions from AI response
func (a *AnthropicProvider) parseActionsFromContent(content string) []Action {
	var actions []Action

	// Parse ACTION blocks from the response
	lines := strings.Split(content, "\n")
	i := 0
	for i < len(lines) {
		line := strings.TrimSpace(lines[i])
		if strings.HasPrefix(line, "ACTION:") {
			action := Action{
				Parameters:       make(map[string]interface{}),
				RequiresApproval: true,
				Confidence:       0.9,
			}

			// Extract action type
			actionType := strings.TrimSpace(strings.TrimPrefix(line, "ACTION:"))
			action.Type = actionType

			// Parse subsequent lines for this action
			i++
			for i < len(lines) && !strings.HasPrefix(strings.TrimSpace(lines[i]), "ACTION:") {
				line = strings.TrimSpace(lines[i])

				if strings.HasPrefix(line, "RANGE:") {
					action.Parameters["range"] = strings.TrimSpace(strings.TrimPrefix(line, "RANGE:"))
				} else if strings.HasPrefix(line, "VALUES:") {
					// Parse JSON array of values
					valuesStr := strings.TrimSpace(strings.TrimPrefix(line, "VALUES:"))
					var values []interface{}
					if err := json.Unmarshal([]byte(valuesStr), &values); err == nil {
						action.Parameters["values"] = values
					}
				} else if strings.HasPrefix(line, "FORMULA:") {
					action.Parameters["formula"] = strings.TrimSpace(strings.TrimPrefix(line, "FORMULA:"))
				} else if strings.HasPrefix(line, "DESCRIPTION:") {
					action.Description = strings.TrimSpace(strings.TrimPrefix(line, "DESCRIPTION:"))
				}

				i++
			}

			if action.Type != "" && len(action.Parameters) > 0 {
				actions = append(actions, action)
			}
			continue
		}
		i++
	}

	// Fallback to simple detection
	if len(actions) == 0 && (strings.Contains(strings.ToLower(content), "update cell") || strings.Contains(strings.ToLower(content), "change cell")) {
		actions = append(actions, Action{
			Type:             "cell_update",
			Description:      "AI suggested cell update",
			Parameters:       map[string]interface{}{},
			Confidence:       0.8,
			RequiresApproval: true,
		})
	}

	return actions
}

// handleHTTPError converts HTTP errors to AIError
func (a *AnthropicProvider) handleHTTPError(err error) *AIError {
	return &AIError{
		Type:       ErrorTypeTimeout,
		Message:    "HTTP request failed",
		Underlying: err,
	}
}

// handleAPIError converts API error responses to AIError
func (a *AnthropicProvider) handleAPIError(resp *http.Response) *AIError {
	body, _ := io.ReadAll(resp.Body)

	log.Error().
		Int("status_code", resp.StatusCode).
		Str("response_body", string(body)).
		Msg("Anthropic API error details")

	var apiErr anthropicError
	json.Unmarshal(body, &apiErr)

	var errorType ErrorType
	switch resp.StatusCode {
	case 401:
		errorType = ErrorTypeAuth
	case 429:
		errorType = ErrorTypeRateLimit
	case 400:
		errorType = ErrorTypeInvalidInput
	case 529:
		errorType = ErrorTypeRateLimit // 529 is "overloaded", treat as rate limit
	default:
		errorType = ErrorTypeServerError
	}

	aiErr := &AIError{
		Type:    errorType,
		Message: fmt.Sprintf("Anthropic API error: %s", apiErr.Message),
		Code:    strconv.Itoa(resp.StatusCode),
	}

	// Parse retry-after header for rate limits and overload errors
	if resp.StatusCode == 429 || resp.StatusCode == 529 {
		if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
			if seconds, err := strconv.Atoi(retryAfter); err == nil {
				aiErr.RetryAfter = seconds
			}
		}
		// If no Retry-After header is provided, we'll use exponential backoff
	}

	return aiErr
}
