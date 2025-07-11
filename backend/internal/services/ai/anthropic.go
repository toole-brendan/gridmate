package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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
		config.RetryDelay = 1 * time.Second
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
			select {
			case <-time.After(a.config.RetryDelay * time.Duration(attempt)):
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
	Model       string              `json:"model"`
	MaxTokens   int                 `json:"max_tokens"`
	Messages    []anthropicMessage  `json:"messages"`
	Temperature *float32            `json:"temperature,omitempty"`
	TopP        *float32            `json:"top_p,omitempty"`
	Stream      bool                `json:"stream,omitempty"`
	System      string              `json:"system,omitempty"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicResponse struct {
	ID           string                `json:"id"`
	Type         string                `json:"type"`
	Role         string                `json:"role"`
	Content      []anthropicContent    `json:"content"`
	Model        string                `json:"model"`
	StopReason   string                `json:"stop_reason"`
	StopSequence string                `json:"stop_sequence"`
	Usage        anthropicUsage        `json:"usage"`
}

type anthropicContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type anthropicUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type anthropicStreamEvent struct {
	Type    string                 `json:"type"`
	Index   int                    `json:"index,omitempty"`
	Delta   *anthropicDelta        `json:"delta,omitempty"`
	Message *anthropicResponse     `json:"message,omitempty"`
	Usage   *anthropicUsage        `json:"usage,omitempty"`
	Error   *anthropicError        `json:"error,omitempty"`
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
		anthropicReq.MaxTokens = 4096 // Default max tokens
	}

	if request.Temperature > 0 {
		anthropicReq.Temperature = &request.Temperature
	}

	if request.TopP > 0 {
		anthropicReq.TopP = &request.TopP
	}

	// Convert messages, handling system messages specially
	for _, msg := range request.Messages {
		if msg.Role == "system" {
			anthropicReq.System = msg.Content
		} else {
			anthropicReq.Messages = append(anthropicReq.Messages, anthropicMessage{
				Role:    msg.Role,
				Content: msg.Content,
			})
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
		case "content_block_delta":
			if event.Delta != nil {
				ch <- CompletionChunk{
					ID:      messageID,
					Delta:   event.Delta.Text,
					Content: event.Delta.Text,
					Done:    false,
				}
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
	for _, c := range resp.Content {
		if c.Type == "text" {
			content.WriteString(c.Text)
		}
	}

	response := &CompletionResponse{
		ID:      resp.ID,
		Content: content.String(),
		Model:   resp.Model,
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

	// Look for action suggestions in the response
	// This is a simplified parser - in production, you might use more sophisticated parsing
	if strings.Contains(strings.ToLower(content), "update cell") || strings.Contains(strings.ToLower(content), "change cell") {
		// Try to extract cell references and values
		// This is a placeholder - implement more robust parsing based on your prompt engineering
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
	default:
		errorType = ErrorTypeServerError
	}

	aiErr := &AIError{
		Type:    errorType,
		Message: fmt.Sprintf("Anthropic API error: %s", apiErr.Message),
		Code:    strconv.Itoa(resp.StatusCode),
	}

	// Parse retry-after header for rate limits
	if resp.StatusCode == 429 {
		if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
			if seconds, err := strconv.Atoi(retryAfter); err == nil {
				aiErr.RetryAfter = seconds
			}
		}
	}

	return aiErr
}