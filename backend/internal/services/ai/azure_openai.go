package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

const (
	azureAPIVersion = "2024-02-01"
)

// AzureOpenAIProvider implements the Provider interface for Azure OpenAI
type AzureOpenAIProvider struct {
	config     ProviderConfig
	httpClient *http.Client
	logger     *logrus.Logger
}

// NewAzureOpenAIProvider creates a new Azure OpenAI provider
func NewAzureOpenAIProvider(config ProviderConfig, logger *logrus.Logger) *AzureOpenAIProvider {
	if config.Model == "" {
		config.Model = "gpt-4-turbo"
	}
	if config.MaxRetries == 0 {
		config.MaxRetries = 3
	}
	if config.Timeout == 0 {
		config.Timeout = 60
	}

	return &AzureOpenAIProvider{
		config: config,
		httpClient: &http.Client{
			Timeout: time.Duration(config.Timeout) * time.Second,
		},
		logger: logger,
	}
}

// openAIRequest represents the request structure for OpenAI API
type openAIRequest struct {
	Model         string            `json:"model"`
	Messages      []openAIMessage   `json:"messages"`
	MaxTokens     int               `json:"max_tokens,omitempty"`
	Temperature   float32           `json:"temperature,omitempty"`
	Stream        bool              `json:"stream,omitempty"`
	Stop          []string          `json:"stop,omitempty"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	ID      string         `json:"id"`
	Object  string         `json:"object"`
	Created int64          `json:"created"`
	Model   string         `json:"model"`
	Choices []openAIChoice `json:"choices"`
	Usage   openAIUsage    `json:"usage"`
}

type openAIChoice struct {
	Index        int            `json:"index"`
	Message      openAIMessage  `json:"message"`
	FinishReason string         `json:"finish_reason"`
}

type openAIUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type openAIStreamResponse struct {
	ID      string               `json:"id"`
	Object  string               `json:"object"`
	Created int64                `json:"created"`
	Model   string               `json:"model"`
	Choices []openAIStreamChoice `json:"choices"`
}

type openAIStreamChoice struct {
	Index        int              `json:"index"`
	Delta        openAIDelta      `json:"delta"`
	FinishReason *string          `json:"finish_reason"`
}

type openAIDelta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}

// embeddingRequest for Azure OpenAI embeddings
type embeddingRequest struct {
	Input          []string `json:"input"`
	Model          string   `json:"model"`
	EncodingFormat string   `json:"encoding_format,omitempty"`
}

type embeddingResponse struct {
	Object string           `json:"object"`
	Data   []embeddingData  `json:"data"`
	Model  string           `json:"model"`
	Usage  embeddingUsage   `json:"usage"`
}

type embeddingData struct {
	Object    string    `json:"object"`
	Index     int       `json:"index"`
	Embedding []float32 `json:"embedding"`
}

type embeddingUsage struct {
	PromptTokens int `json:"prompt_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// Complete generates a completion for the given request
func (p *AzureOpenAIProvider) Complete(ctx context.Context, request *CompletionRequest) (*CompletionResponse, error) {
	openAIReq := p.buildRequest(request, false)

	var response openAIResponse
	err := p.doRequestWithRetry(ctx, "/chat/completions", openAIReq, &response)
	if err != nil {
		return nil, fmt.Errorf("azure openai complete: %w", err)
	}

	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	choice := response.Choices[0]
	return &CompletionResponse{
		Content: choice.Message.Content,
		Model:   response.Model,
		Usage: Usage{
			PromptTokens:     response.Usage.PromptTokens,
			CompletionTokens: response.Usage.CompletionTokens,
			TotalTokens:      response.Usage.TotalTokens,
		},
		Created: time.Now(),
	}, nil
}

// CompleteStream generates a streaming completion for the given request
func (p *AzureOpenAIProvider) CompleteStream(ctx context.Context, request *CompletionRequest) (<-chan CompletionChunk, error) {
	openAIReq := p.buildRequest(request, true)
	
	body, err := json.Marshal(openAIReq)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/openai/deployments/%s/chat/completions?api-version=%s",
		p.config.Endpoint, p.config.Model, azureAPIVersion)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	p.setHeaders(req)
	
	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("azure openai API error: status=%d, body=%s", resp.StatusCode, string(body))
	}

	chunks := make(chan CompletionChunk, 100)
	
	go func() {
		defer close(chunks)
		defer resp.Body.Close()

		reader := bufio.NewReader(resp.Body)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				if err != io.EOF {
					chunks <- CompletionChunk{Error: err}
				}
				break
			}

			line = strings.TrimSpace(line)
			if !strings.HasPrefix(line, "data: ") {
				continue
			}

			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				chunks <- CompletionChunk{Done: true}
				break
			}

			var streamResp openAIStreamResponse
			if err := json.Unmarshal([]byte(data), &streamResp); err != nil {
				p.logger.WithError(err).Error("Failed to unmarshal stream response")
				continue
			}

			if len(streamResp.Choices) > 0 {
				choice := streamResp.Choices[0]
				if choice.Delta.Content != "" {
					chunks <- CompletionChunk{Content: choice.Delta.Content}
				}
				if choice.FinishReason != nil && *choice.FinishReason != "" {
					chunks <- CompletionChunk{Done: true}
				}
			}
		}
	}()

	return chunks, nil
}

// Embed generates embeddings for the given texts
func (p *AzureOpenAIProvider) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	embReq := embeddingRequest{
		Input: texts,
		Model: "text-embedding-ada-002", // Default embedding model
	}

	var response embeddingResponse
	err := p.doRequestWithRetry(ctx, "/embeddings", embReq, &response)
	if err != nil {
		return nil, fmt.Errorf("azure openai embed: %w", err)
	}

	embeddings := make([][]float32, len(response.Data))
	for i := range response.Data {
		embeddings[response.Data[i].Index] = response.Data[i].Embedding
	}

	return embeddings, nil
}

// GetName returns the provider name
func (p *AzureOpenAIProvider) GetName() string {
	return "azure_openai"
}

// IsAvailable checks if the provider is configured and available
func (p *AzureOpenAIProvider) IsAvailable() bool {
	return p.config.APIKey != "" && p.config.Endpoint != ""
}

// buildRequest converts a CompletionRequest to openAIRequest
func (p *AzureOpenAIProvider) buildRequest(request *CompletionRequest, stream bool) *openAIRequest {
	messages := make([]openAIMessage, 0, len(request.Messages)+1)
	
	// Add system prompt if provided
	if request.SystemPrompt != "" {
		messages = append(messages, openAIMessage{
			Role:    "system",
			Content: request.SystemPrompt,
		})
	}

	// Add other messages
	for _, msg := range request.Messages {
		messages = append(messages, openAIMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	model := request.Model
	if model == "" {
		model = p.config.Model
	}

	return &openAIRequest{
		Model:       model,
		Messages:    messages,
		MaxTokens:   request.MaxTokens,
		Temperature: request.Temperature,
		Stream:      stream,
		Stop:        request.StopSequences,
	}
}

// doRequestWithRetry performs an HTTP request with retry logic
func (p *AzureOpenAIProvider) doRequestWithRetry(ctx context.Context, endpoint string, reqBody interface{}, response interface{}) error {
	body, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	// Extract deployment name from model config
	deployment := p.config.Model
	if endpoint == "/embeddings" {
		deployment = "text-embedding-ada-002" // Use dedicated embedding deployment
	}

	url := fmt.Sprintf("%s/openai/deployments/%s%s?api-version=%s",
		p.config.Endpoint, deployment, endpoint, azureAPIVersion)

	for attempt := 0; attempt < p.config.MaxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff
			time.Sleep(time.Duration(attempt*attempt) * time.Second)
		}

		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
		if err != nil {
			return fmt.Errorf("create request: %w", err)
		}

		p.setHeaders(req)

		resp, err := p.httpClient.Do(req)
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			continue
		}

		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			if err := json.Unmarshal(respBody, response); err != nil {
				return fmt.Errorf("unmarshal response: %w", err)
			}
			return nil
		}

		// Handle rate limiting
		if resp.StatusCode == http.StatusTooManyRequests {
			retryAfter := 60 // default to 60 seconds
			if val := resp.Header.Get("Retry-After"); val != "" {
				// Parse retry-after header
			}
			return &AIError{
				Type:       ErrorTypeRateLimit,
				Message:    "Rate limit exceeded",
				RetryAfter: retryAfter,
			}
		}

		// Retry on server errors
		if resp.StatusCode >= 500 {
			p.logger.WithFields(logrus.Fields{
				"status": resp.StatusCode,
				"body":   string(respBody),
			}).Warn("Azure OpenAI API server error, retrying")
			continue
		}

		// Non-retryable error
		return fmt.Errorf("azure openai API error: status=%d, body=%s", resp.StatusCode, string(respBody))
	}

	return fmt.Errorf("max retries exceeded")
}

// setHeaders sets the required headers for Azure OpenAI API requests
func (p *AzureOpenAIProvider) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api-key", p.config.APIKey)
}

// GetProviderName returns the provider name
func (p *AzureOpenAIProvider) GetProviderName() string {
	return "azure_openai"
}

// GetCompletion implements AIProvider interface
func (p *AzureOpenAIProvider) GetCompletion(ctx context.Context, request CompletionRequest) (*CompletionResponse, error) {
	return p.Complete(ctx, &request)
}

// GetStreamingCompletion implements AIProvider interface
func (p *AzureOpenAIProvider) GetStreamingCompletion(ctx context.Context, request CompletionRequest) (<-chan CompletionChunk, error) {
	return p.CompleteStream(ctx, &request)
}

// GetEmbedding implements AIProvider interface
func (p *AzureOpenAIProvider) GetEmbedding(ctx context.Context, text string) ([]float32, error) {
	embeddings, err := p.Embed(ctx, []string{text})
	if err != nil {
		return nil, err
	}
	if len(embeddings) == 0 {
		return nil, fmt.Errorf("no embeddings returned")
	}
	return embeddings[0], nil
}

// IsHealthy implements AIProvider interface
func (p *AzureOpenAIProvider) IsHealthy(ctx context.Context) error {
	// Simple health check - verify we can make a small completion
	req := CompletionRequest{
		Messages: []Message{
			{Role: "user", Content: "test"},
		},
		MaxTokens: 1,
	}
	_, err := p.GetCompletion(ctx, req)
	return err
}