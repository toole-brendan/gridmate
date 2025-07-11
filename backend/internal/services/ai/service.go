package ai

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/rs/zerolog/log"
)

// Service represents the main AI service
type Service struct {
	provider      AIProvider
	promptBuilder *PromptBuilder
	config        ServiceConfig
}

// ServiceConfig holds configuration for the AI service
type ServiceConfig struct {
	Provider        string        `json:"provider"`         // "anthropic", "azure_openai"
	DefaultModel    string        `json:"default_model"`
	StreamingMode   bool          `json:"streaming_mode"`
	MaxTokens       int           `json:"max_tokens"`
	Temperature     float32       `json:"temperature"`
	TopP            float32       `json:"top_p"`
	RequestTimeout  time.Duration `json:"request_timeout"`
	EnableActions   bool          `json:"enable_actions"`   // Parse actions from responses
	EnableEmbedding bool          `json:"enable_embedding"` // Use embedding provider
}

// NewService creates a new AI service
func NewService(config ServiceConfig) (*Service, error) {
	// Set defaults
	if config.RequestTimeout == 0 {
		config.RequestTimeout = 30 * time.Second
	}
	if config.MaxTokens == 0 {
		config.MaxTokens = 4096
	}
	if config.Temperature == 0 {
		config.Temperature = 0.7
	}

	// Create provider based on config
	provider, err := createProvider(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create AI provider: %w", err)
	}

	service := &Service{
		provider:      provider,
		promptBuilder: NewPromptBuilder(),
		config:        config,
	}

	return service, nil
}

// NewServiceFromEnv creates a new AI service from environment variables
func NewServiceFromEnv() (*Service, error) {
	config := ServiceConfig{
		Provider:        getEnvOrDefault("AI_PROVIDER", "anthropic"),
		DefaultModel:    getEnvOrDefault("AI_MODEL", ""),
		StreamingMode:   getEnvOrDefault("AI_STREAMING", "true") == "true",
		MaxTokens:       4096,
		Temperature:     0.7,
		TopP:            0.9,
		RequestTimeout:  30 * time.Second,
		EnableActions:   true,
		EnableEmbedding: true,
	}

	return NewService(config)
}

// ProcessChatMessage processes a chat message with context
func (s *Service) ProcessChatMessage(ctx context.Context, userMessage string, context *FinancialContext) (*CompletionResponse, error) {
	// Auto-detect model type if not provided
	if context != nil && context.ModelType == "" {
		context.ModelType = s.promptBuilder.DetectModelType(context)
	}

	// Build the prompt
	messages := s.promptBuilder.BuildChatPrompt(userMessage, context)

	// Create request
	request := CompletionRequest{
		Messages:    messages,
		MaxTokens:   s.config.MaxTokens,
		Temperature: s.config.Temperature,
		TopP:        s.config.TopP,
		Model:       s.config.DefaultModel,
	}

	// Get response
	response, err := s.provider.GetCompletion(ctx, request)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get completion from AI provider")
		return nil, fmt.Errorf("AI request failed: %w", err)
	}

	// Log the interaction
	log.Info().
		Str("provider", s.provider.GetProviderName()).
		Str("model", response.Model).
		Int("prompt_tokens", response.Usage.PromptTokens).
		Int("completion_tokens", response.Usage.CompletionTokens).
		Msg("AI chat completion")

	return response, nil
}

// ProcessChatMessageStreaming processes a chat message with streaming response
func (s *Service) ProcessChatMessageStreaming(ctx context.Context, userMessage string, context *FinancialContext) (<-chan CompletionChunk, error) {
	// Auto-detect model type if not provided
	if context != nil && context.ModelType == "" {
		context.ModelType = s.promptBuilder.DetectModelType(context)
	}

	// Build the prompt
	messages := s.promptBuilder.BuildChatPrompt(userMessage, context)

	// Create request
	request := CompletionRequest{
		Messages:    messages,
		MaxTokens:   s.config.MaxTokens,
		Temperature: s.config.Temperature,
		TopP:        s.config.TopP,
		Model:       s.config.DefaultModel,
		Stream:      true,
	}

	// Get streaming response
	chunks, err := s.provider.GetStreamingCompletion(ctx, request)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get streaming completion from AI provider")
		return nil, fmt.Errorf("AI streaming request failed: %w", err)
	}

	return chunks, nil
}

// GenerateFormula generates a formula based on description and context
func (s *Service) GenerateFormula(ctx context.Context, description string, context *FinancialContext) (*CompletionResponse, error) {
	// Build formula-specific prompt
	messages := s.promptBuilder.BuildFormulaPrompt(description, context)

	// Create request
	request := CompletionRequest{
		Messages:    messages,
		MaxTokens:   s.config.MaxTokens,
		Temperature: 0.3, // Lower temperature for formula generation
		TopP:        s.config.TopP,
		Model:       s.config.DefaultModel,
	}

	response, err := s.provider.GetCompletion(ctx, request)
	if err != nil {
		log.Error().Err(err).Str("description", description).Msg("Failed to generate formula")
		return nil, fmt.Errorf("formula generation failed: %w", err)
	}

	log.Info().
		Str("provider", s.provider.GetProviderName()).
		Str("description", description).
		Msg("Formula generated")

	return response, nil
}

// ValidateModel validates a financial model or formulas
func (s *Service) ValidateModel(ctx context.Context, context *FinancialContext, validationType string) (*CompletionResponse, error) {
	// Build validation prompt
	messages := s.promptBuilder.BuildValidationPrompt(context, validationType)

	// Create request
	request := CompletionRequest{
		Messages:    messages,
		MaxTokens:   s.config.MaxTokens,
		Temperature: 0.2, // Lower temperature for validation
		TopP:        s.config.TopP,
		Model:       s.config.DefaultModel,
	}

	response, err := s.provider.GetCompletion(ctx, request)
	if err != nil {
		log.Error().Err(err).Str("validation_type", validationType).Msg("Failed to validate model")
		return nil, fmt.Errorf("model validation failed: %w", err)
	}

	log.Info().
		Str("provider", s.provider.GetProviderName()).
		Str("validation_type", validationType).
		Msg("Model validation completed")

	return response, nil
}

// AnalyzeSelection analyzes the currently selected range
func (s *Service) AnalyzeSelection(ctx context.Context, context *FinancialContext) (*CompletionResponse, error) {
	// Build analysis prompt
	messages := s.promptBuilder.BuildAnalysisPrompt(context, "selection_analysis")

	// Create request
	request := CompletionRequest{
		Messages:    messages,
		MaxTokens:   s.config.MaxTokens,
		Temperature: 0.5,
		TopP:        s.config.TopP,
		Model:       s.config.DefaultModel,
	}

	response, err := s.provider.GetCompletion(ctx, request)
	if err != nil {
		log.Error().Err(err).Msg("Failed to analyze selection")
		return nil, fmt.Errorf("selection analysis failed: %w", err)
	}

	log.Info().
		Str("provider", s.provider.GetProviderName()).
		Str("range", context.SelectedRange).
		Msg("Selection analysis completed")

	return response, nil
}

// GetEmbedding generates embeddings for text (for context management)
func (s *Service) GetEmbedding(ctx context.Context, text string) ([]float32, error) {
	if !s.config.EnableEmbedding {
		return nil, &AIError{
			Type:    ErrorTypeUnavailable,
			Message: "Embedding generation is disabled",
		}
	}

	embedding, err := s.provider.GetEmbedding(ctx, text)
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate embedding")
		return nil, fmt.Errorf("embedding generation failed: %w", err)
	}

	log.Debug().Int("dimensions", len(embedding)).Msg("Embedding generated")
	return embedding, nil
}

// IsHealthy checks if the AI service is healthy
func (s *Service) IsHealthy(ctx context.Context) error {
	return s.provider.IsHealthy(ctx)
}

// GetProviderInfo returns information about the current provider
func (s *Service) GetProviderInfo() map[string]interface{} {
	return map[string]interface{}{
		"provider":         s.provider.GetProviderName(),
		"model":           s.config.DefaultModel,
		"streaming_mode":  s.config.StreamingMode,
		"max_tokens":      s.config.MaxTokens,
		"temperature":     s.config.Temperature,
		"actions_enabled": s.config.EnableActions,
		"embedding_enabled": s.config.EnableEmbedding,
	}
}

// createProvider creates an AI provider based on configuration
func createProvider(config ServiceConfig) (AIProvider, error) {
	switch config.Provider {
	case "anthropic":
		apiKey := os.Getenv("ANTHROPIC_API_KEY")
		if apiKey == "" {
			return nil, fmt.Errorf("ANTHROPIC_API_KEY environment variable is required")
		}

		providerConfig := ProviderConfig{
			APIKey:     apiKey,
			Model:      config.DefaultModel,
			Timeout:    config.RequestTimeout,
			MaxRetries: 3,
			RetryDelay: 1 * time.Second,
		}

		return NewAnthropicProvider(providerConfig), nil

	case "azure_openai":
		endpoint := os.Getenv("AZURE_OPENAI_ENDPOINT")
		apiKey := os.Getenv("AZURE_OPENAI_KEY")
		if endpoint == "" || apiKey == "" {
			return nil, fmt.Errorf("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY environment variables are required")
		}

		providerConfig := ProviderConfig{
			APIKey:     apiKey,
			Endpoint:   endpoint,
			Model:      config.DefaultModel,
			Timeout:    config.RequestTimeout,
			MaxRetries: 3,
			RetryDelay: 1 * time.Second,
		}

		// Return Azure OpenAI provider (would need to be implemented)
		return nil, fmt.Errorf("Azure OpenAI provider not yet implemented")

	default:
		return nil, fmt.Errorf("unsupported AI provider: %s", config.Provider)
	}
}

// getEnvOrDefault gets an environment variable or returns a default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// ChatRequest represents a chat request from the client
type ChatRequest struct {
	Message string           `json:"message"`
	Context *FinancialContext `json:"context,omitempty"`
	Options *ChatOptions     `json:"options,omitempty"`
}

// ChatOptions represents options for chat requests
type ChatOptions struct {
	Stream      bool    `json:"stream,omitempty"`
	Temperature float32 `json:"temperature,omitempty"`
	MaxTokens   int     `json:"max_tokens,omitempty"`
}

// ChatResponse represents a chat response to the client
type ChatResponse struct {
	Message     string    `json:"message"`
	Actions     []Action  `json:"actions,omitempty"`
	ModelType   string    `json:"model_type,omitempty"`
	Usage       Usage     `json:"usage"`
	Provider    string    `json:"provider"`
	RequestTime time.Time `json:"request_time"`
}

// ProcessChatRequest processes a chat request from the client
func (s *Service) ProcessChatRequest(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	startTime := time.Now()

	// Override service config with request options if provided
	if req.Options != nil {
		if req.Options.Stream && s.config.StreamingMode {
			// For streaming requests, use the streaming method instead
			return nil, fmt.Errorf("use ProcessChatRequestStreaming for streaming requests")
		}
	}

	response, err := s.ProcessChatMessage(ctx, req.Message, req.Context)
	if err != nil {
		return nil, err
	}

	// Convert to client response format
	chatResponse := &ChatResponse{
		Message:     response.Content,
		Actions:     response.Actions,
		Usage:       response.Usage,
		Provider:    s.provider.GetProviderName(),
		RequestTime: startTime,
	}

	if req.Context != nil {
		chatResponse.ModelType = req.Context.ModelType
	}

	return chatResponse, nil
}