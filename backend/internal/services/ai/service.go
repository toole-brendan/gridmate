package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/sirupsen/logrus"
)

// Service represents the main AI service
type Service struct {
	provider          AIProvider
	promptBuilder     *PromptBuilder
	toolExecutor      *ToolExecutor
	memoryService     *FinancialMemoryService
	contextAnalyzer   *FinancialModelAnalyzer
	toolOrchestrator  *ToolOrchestrator
	config            ServiceConfig
	contextBuilder    interface{} // Will be set to excel.ContextBuilder
	queuedOpsRegistry interface{} // Will be set to *services.QueuedOperationRegistry
}

// ServiceConfig holds configuration for the AI service
type ServiceConfig struct {
	Provider        string        `json:"provider"` // "anthropic", "azure_openai"
	DefaultModel    string        `json:"default_model"`
	StreamingMode   bool          `json:"streaming_mode"`
	MaxTokens       int           `json:"max_tokens"`
	Temperature     float32       `json:"temperature"`
	TopP            float32       `json:"top_p"`
	RequestTimeout  time.Duration `json:"request_timeout"`
	RetryDelay      time.Duration `json:"retry_delay"`      // Added for configurable retry
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
		config.MaxTokens = 8192 // Increased for complex tool sequences
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
		provider:         provider,
		promptBuilder:    NewPromptBuilder(),
		toolExecutor:     nil, // Will be set later if needed
		memoryService:    nil, // Will be set via SetAdvancedComponents if needed
		contextAnalyzer:  nil, // Will be set via SetAdvancedComponents if needed
		toolOrchestrator: nil, // Will be set via SetAdvancedComponents if needed
		config:           config,
	}

	return service, nil
}

// NewServiceFromEnv creates a new AI service from environment variables
func NewServiceFromEnv() (*Service, error) {
	config := ServiceConfig{
		Provider:        getEnvOrDefault("AI_PROVIDER", "anthropic"), // Default to anthropic
		DefaultModel:    getEnvOrDefault("AI_MODEL", ""),
		StreamingMode:   getEnvOrDefault("AI_STREAMING", "true") == "true",
		MaxTokens:       8192, // Increased for complex tool sequences
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

	// Add Excel tools if enabled - use smart selection for better token efficiency
	if s.config.EnableActions && s.toolExecutor != nil {
		request.Tools = s.selectRelevantTools(userMessage, context)
		log.Info().
			Bool("actions_enabled", s.config.EnableActions).
			Bool("tool_executor_available", s.toolExecutor != nil).
			Int("tools_count", len(request.Tools)).
			Int("total_available_tools", len(GetExcelTools())).
			Msg("Adding relevant Excel tools to request using smart selection")
	} else {
		log.Warn().
			Bool("actions_enabled", s.config.EnableActions).
			Bool("tool_executor_available", s.toolExecutor != nil).
			Msg("Tools not added to request")
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
		"provider":          s.provider.GetProviderName(),
		"model":             s.config.DefaultModel,
		"streaming_mode":    s.config.StreamingMode,
		"max_tokens":        s.config.MaxTokens,
		"temperature":       s.config.Temperature,
		"actions_enabled":   s.config.EnableActions,
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
			RetryDelay: config.RetryDelay,
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
			RetryDelay: config.RetryDelay,
		}

		logger := logrus.New()
		return NewAzureOpenAIProvider(providerConfig, logger), nil

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
	Message string            `json:"message"`
	Context *FinancialContext `json:"context,omitempty"`
	Options *ChatOptions      `json:"options,omitempty"`
}

// ChatOptions represents options for chat requests
type ChatOptions struct {
	Stream      bool    `json:"stream,omitempty"`
	Temperature float32 `json:"temperature,omitempty"`
	MaxTokens   int     `json:"max_tokens,omitempty"`
}

// ProcessChatRequest processes a chat request from the client
func (s *Service) ProcessChatRequest(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {

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
		Message:    response.Content,
		Model:      response.Model,
		TokensUsed: response.Usage.TotalTokens,
		Confidence: 0.95, // Default confidence
	}

	// Convert actions to suggested actions format
	if len(response.Actions) > 0 {
		chatResponse.SuggestedActions = make([]SuggestedAction, len(response.Actions))
		for i, action := range response.Actions {
			chatResponse.SuggestedActions[i] = SuggestedAction{
				Type:        action.Type,
				Description: action.Description,
				Target:      action.Parameters["target"].(string),
			}
		}
	}

	return chatResponse, nil
}

// GetCompletion implements the AIProvider interface
func (s *Service) GetCompletion(ctx context.Context, request CompletionRequest) (*CompletionResponse, error) {
	// Use the underlying provider's GetCompletion method
	return s.provider.GetCompletion(ctx, request)
}

// GetStreamingCompletion implements the AIProvider interface
func (s *Service) GetStreamingCompletion(ctx context.Context, request CompletionRequest) (<-chan CompletionChunk, error) {
	// Use the underlying provider's GetStreamingCompletion method
	return s.provider.GetStreamingCompletion(ctx, request)
}

// GetProviderName implements the AIProvider interface
func (s *Service) GetProviderName() string {
	return s.provider.GetProviderName()
}

// SetToolExecutor sets the tool executor for the AI service
func (s *Service) SetToolExecutor(executor *ToolExecutor) {
	s.toolExecutor = executor
	log.Info().
		Bool("executor_is_nil", executor == nil).
		Msg("SetToolExecutor called")
}

// ProcessToolCalls processes multiple tool calls
func (s *Service) ProcessToolCalls(ctx context.Context, sessionID string, toolCalls []ToolCall, autonomyMode string) ([]ToolResult, error) {
	log.Info().
		Str("session_id", sessionID).
		Int("total_tools", len(toolCalls)).
		Interface("tool_names", getToolNames(toolCalls)).
		Str("autonomy_mode", autonomyMode).
		Msg("Processing tool calls")

	// Check if we can batch any operations
	if s.toolExecutor == nil {
		log.Error().Msg("Tool executor not initialized")
		return nil, fmt.Errorf("tool executor not initialized")
	}

	// Detect batchable operations for efficiency
	batches := s.toolExecutor.DetectBatchableOperations(toolCalls)
	log.Info().
		Str("session_id", sessionID).
		Int("total_tools", len(toolCalls)).
		Int("batch_count", len(batches)).
		Msg("Processing tool calls with batch detection")

	results := make([]ToolResult, 0, len(toolCalls))

	// Process each batch
	for i, batch := range batches {
		log.Info().
			Str("session_id", sessionID).
			Int("batch_index", i).
			Int("tools_in_batch", len(batch)).
			Interface("batch_tools", getToolNames(batch)).
			Msg("Processing batch")

		// For batches with multiple tools, we could optimize further
		// For now, process sequentially but mark with batch IDs
		
		// Create a mapping of batch indices to tool IDs for dependency tracking
		batchToolIDs := make([]string, len(batch))
		for idx, tc := range batch {
			batchToolIDs[idx] = tc.ID
		}
		
		for j, toolCall := range batch {
			// Add batch metadata if this is part of a batch
			if len(batch) > 1 {
				toolCall.Input["_batch_id"] = fmt.Sprintf("batch_%d_%s", i, sessionID)
				toolCall.Input["_batch_index"] = j
				// Pass the tool IDs of all tools in the batch for dependency tracking
				toolCall.Input["_batch_tool_ids"] = batchToolIDs
			}

			log.Debug().
				Str("tool_name", toolCall.Name).
				Str("tool_id", toolCall.ID).
				Interface("input", toolCall.Input).
				Msg("Executing individual tool in batch")

			result, err := s.toolExecutor.ExecuteTool(ctx, sessionID, toolCall, autonomyMode)
			if err != nil {
				log.Error().
					Err(err).
					Str("tool_name", toolCall.Name).
					Str("tool_id", toolCall.ID).
					Msg("Tool execution failed")
				// Continue with error result instead of failing all
				result = &ToolResult{
					Type:      "tool_result",
					ToolUseID: toolCall.ID,
					IsError:   true,
					Content:   err.Error(),
				}
			}
			results = append(results, *result)
		}
	}

	log.Info().
		Str("session_id", sessionID).
		Int("total_results", len(results)).
		Int("successful", countSuccessful(results)).
		Msg("Tool calls processing completed")

	return results, nil
}

// ProcessToolCallsWithMessageID processes multiple tool calls with a message ID for tracking
func (s *Service) ProcessToolCallsWithMessageID(ctx context.Context, sessionID string, toolCalls []ToolCall, autonomyMode string, messageID string) ([]ToolResult, error) {
	// Add message ID to context
	if messageID != "" {
		ctx = context.WithValue(ctx, "message_id", messageID)
	}
	return s.ProcessToolCalls(ctx, sessionID, toolCalls, autonomyMode)
}

// Helper function to get tool names for logging
func getToolNames(toolCalls []ToolCall) []string {
	names := make([]string, len(toolCalls))
	for i, tc := range toolCalls {
		names[i] = tc.Name
	}
	return names
}

// Helper function to count successful results
func countSuccessful(results []ToolResult) int {
	count := 0
	for _, r := range results {
		if !r.IsError {
			count++
		}
	}
	return count
}

// selectRelevantTools intelligently selects which tools to include based on the user's message
// This reduces token usage by only including tools that are likely to be needed
func (s *Service) selectRelevantTools(userMessage string, context *FinancialContext) []ExcelTool {
	allTools := GetExcelTools()

	// Convert message to lowercase for easier matching
	msgLower := strings.ToLower(userMessage)

	// Keywords that indicate read-only operations
	readOnlyKeywords := []string{"what", "show", "tell", "explain", "analyze", "check", "find", "look", "see", "view", "get"}

	// Keywords that indicate write operations
	writeKeywords := []string{"create", "make", "build", "add", "write", "insert", "generate", "set", "update", "change", "modify"}

	// Keywords for specific model types
	modelKeywords := []string{"dcf", "lbo", "model", "valuation", "forecast", "projection"}

	// Check if this is a read-only request
	isReadOnly := false
	for _, keyword := range readOnlyKeywords {
		if strings.Contains(msgLower, keyword) {
			isReadOnly = true
			break
		}
	}

	// Check if this is a write request
	isWriteRequest := false
	for _, keyword := range writeKeywords {
		if strings.Contains(msgLower, keyword) {
			isWriteRequest = true
			break
		}
	}

	// Check if this is a model creation request
	isModelRequest := false
	for _, keyword := range modelKeywords {
		if strings.Contains(msgLower, keyword) {
			isModelRequest = true
			break
		}
	}

	// Build tool list based on request type
	var selectedTools []ExcelTool

	// If the spreadsheet is empty and user wants to create something, include write tools
	if context != nil && len(context.CellValues) == 0 && (isWriteRequest || isModelRequest) {
		// For empty spreadsheet, include only essential tools for creation
		for _, tool := range allTools {
			switch tool.Name {
			case "write_range", "apply_formula", "format_range", "apply_layout":
				selectedTools = append(selectedTools, tool)
			}
		}
	} else if isReadOnly && !isWriteRequest {
		// Read-only request - include only read tools
		for _, tool := range allTools {
			switch tool.Name {
			case "read_range", "analyze_data", "get_named_ranges", "validate_model":
				selectedTools = append(selectedTools, tool)
			}
		}
	} else if isModelRequest {
		// Model creation - include most tools except chart creation
		for _, tool := range allTools {
			if tool.Name != "create_chart" {
				selectedTools = append(selectedTools, tool)
			}
		}
	} else {
		// General request - include basic read/write tools
		for _, tool := range allTools {
			switch tool.Name {
			case "read_range", "write_range", "apply_formula", "analyze_data", "format_range", "apply_layout":
				selectedTools = append(selectedTools, tool)
			}
		}
	}

	// If no tools were selected, include a minimal set
	if len(selectedTools) == 0 {
		for _, tool := range allTools {
			switch tool.Name {
			case "read_range", "write_range":
				selectedTools = append(selectedTools, tool)
			}
		}
	}

	log.Info().
		Str("message", userMessage).
		Int("selected_tools", len(selectedTools)).
		Int("total_tools", len(allTools)).
		Bool("is_read_only", isReadOnly).
		Bool("is_write_request", isWriteRequest).
		Bool("is_model_request", isModelRequest).
		Msg("Selected relevant tools based on user message")

	return selectedTools
}

// ProcessChatWithTools processes a chat message and handles tool calls automatically
func (s *Service) ProcessChatWithTools(ctx context.Context, sessionID string, userMessage string, context *FinancialContext) (*CompletionResponse, error) {
	log.Info().
		Str("session_id", sessionID).
		Str("user_message", userMessage).
		Bool("has_context", context != nil).
		Msg("Starting ProcessChatWithTools")

	// Initial message processing
	messages := []Message{{Role: "user", Content: userMessage}}

	// Add context if provided
	if context != nil && context.ModelType == "" {
		context.ModelType = s.promptBuilder.DetectModelType(context)
	}

	// If we have context, build the full prompt
	if context != nil {
		messages = s.promptBuilder.BuildChatPrompt(userMessage, context)
	}

	// Maximum rounds of tool use
	maxRounds := 50

	for round := 0; round < maxRounds; round++ {
		log.Info().
			Int("round", round).
			Int("max_rounds", maxRounds).
			Msg("Starting tool use round")

		// Create request
		request := CompletionRequest{
			Messages:    messages,
			MaxTokens:   s.config.MaxTokens,
			Temperature: s.config.Temperature,
			TopP:        s.config.TopP,
			Model:       s.config.DefaultModel,
		}

		// Add Excel tools if enabled - use smart selection for round 0, all tools for subsequent rounds
		if s.config.EnableActions && s.toolExecutor != nil {
			if round == 0 {
				request.Tools = s.selectRelevantTools(userMessage, context)
			} else {
				// For subsequent rounds, include all tools since we're in execution mode
				request.Tools = GetExcelTools()
			}
			log.Info().
				Int("tools_count", len(request.Tools)).
				Int("total_available_tools", len(GetExcelTools())).
				Int("round", round).
				Msg("Added relevant tools to ProcessChatWithTools request")
		} else {
			log.Warn().
				Bool("actions_enabled", s.config.EnableActions).
				Bool("tool_executor_available", s.toolExecutor != nil).
				Msg("No tools added to ProcessChatWithTools request")
		}

		// Get response
		response, err := s.provider.GetCompletion(ctx, request)
		if err != nil {
			return nil, fmt.Errorf("AI request failed: %w", err)
		}

		log.Info().
			Int("tool_calls_count", len(response.ToolCalls)).
			Str("response_content", response.Content).
			Msg("Received AI response")

		// If no tool calls, return the response as final
		if len(response.ToolCalls) == 0 {
			log.Info().Msg("No tool calls in response, returning final answer")
			response.IsFinal = true
			return response, nil
		}

		// Process tool calls
		toolResults, err := s.ProcessToolCalls(ctx, sessionID, response.ToolCalls, "")
		if err != nil {
			log.Error().Err(err).Msg("Failed to process tool calls")
		}

		// Add assistant message with tool calls
		assistantMsg := Message{
			Role:      "assistant",
			Content:   response.Content,
			ToolCalls: response.ToolCalls,
		}
		messages = append(messages, assistantMsg)

		// Add tool results
		toolResultMsg := Message{
			Role:        "user",
			ToolResults: toolResults,
		}
		messages = append(messages, toolResultMsg)
	}

	return nil, fmt.Errorf("exceeded maximum rounds of tool use")
}

// ProcessChatWithToolsAndHistory processes a chat message with history and handles tool calls automatically
func (s *Service) ProcessChatWithToolsAndHistory(ctx context.Context, sessionID string, userMessage string, context *FinancialContext, chatHistory []Message, autonomyMode string) (resp *CompletionResponse, err error) {
	// Add panic recovery to prevent crashes
	defer func() {
		if r := recover(); r != nil {
			log.Error().
				Interface("panic", r).
				Str("session_id", sessionID).
				Str("user_message", userMessage).
				Str("stack", fmt.Sprintf("%+v", r)).
				Msg("Panic in ProcessChatWithToolsAndHistory")

			err = fmt.Errorf("internal error processing request: %v", r)
			resp = &CompletionResponse{
				Content: "An error occurred processing your request. Please try again.",
				Usage:   Usage{},
			}
		}
	}()

	log.Info().
		Str("session_id", sessionID).
		Str("user_message", userMessage).
		Bool("has_context", context != nil).
		Int("history_length", len(chatHistory)).
		Str("autonomy_mode", autonomyMode).
		Msg("Starting ProcessChatWithToolsAndHistory")

	// Build messages array with fresh context every time
	messages := make([]Message, 0)
	
	// Use the prompt builder to create system message with current context
	if s.promptBuilder != nil {
		// This will include both base prompt and current context
		messages = s.promptBuilder.BuildPromptWithHistory(userMessage, context, chatHistory)
	} else {
		// Fallback: manually construct messages
		messages = append(messages, chatHistory...)
		messages = append(messages, Message{Role: "user", Content: userMessage})
	}

	// Maximum rounds of tool use
	maxRounds := 50

	for round := 0; round < maxRounds; round++ {
		log.Info().
			Int("round", round).
			Int("messages_count", len(messages)).
			Msg("Starting tool use round")

		// Create completion request
		request := &CompletionRequest{
			Model:       s.config.DefaultModel,
			Messages:    messages,
			MaxTokens:   s.config.MaxTokens,
			Temperature: s.config.Temperature,
			TopP:        s.config.TopP,
			Stream:      false, // Don't stream when using tools
		}

		// Respect autonomy mode with tool choice
		var toolChoice *ToolChoice
		switch autonomyMode {
		case "ask":
			toolChoice = &ToolChoice{Type: "none"}
		case "auto":
			toolChoice = &ToolChoice{Type: "auto"}
		case "full":
			toolChoice = &ToolChoice{Type: "any"}
		}
		
		// Check if user is asking for a specific tool operation
		if specificTool := s.detectSpecificToolRequest(userMessage); specificTool != "" && autonomyMode != "ask" {
			toolChoice = &ToolChoice{
				Type: "tool",
				Name: specificTool,
			}
		}
		
		if toolChoice != nil {
			request.ToolChoice = toolChoice
			log.Info().
				Str("tool_choice", request.ToolChoice.Type).
				Str("tool_name", request.ToolChoice.Name).
				Int("tools_available", len(request.Tools)).
				Str("autonomy_mode", autonomyMode).
				Msg("Processing request with tool choice")
		}

		// Add tools if available - but be smart about it and respect autonomy mode
		if s.config.EnableActions && s.toolExecutor != nil && autonomyMode != "ask" {
			// In "ask" mode, don't provide any tools to the AI
			// For first round, analyze the request to determine what tools are needed
			if round == 0 {
				request.Tools = s.selectRelevantTools(userMessage, context)
			} else {
				// For subsequent rounds, include all tools since we're in execution mode
				request.Tools = GetExcelTools()
			}
			log.Info().
				Int("tools_count", len(request.Tools)).
				Int("round", round).
				Str("autonomy_mode", autonomyMode).
				Msg("Added tools to ProcessChatWithToolsAndHistory request")
		} else if autonomyMode == "ask" {
			log.Info().
				Str("autonomy_mode", autonomyMode).
				Msg("Skipping tools in Ask mode - read-only access")
		}

		// Get response
		response, err := s.provider.GetCompletion(ctx, *request)
		if err != nil {
			return nil, fmt.Errorf("AI request failed: %w", err)
		}

		log.Info().
			Int("tool_calls_count", len(response.ToolCalls)).
			Bool("has_content", response.Content != "").
			Msg("Received response from provider")

		// If no tool calls, we're done
		if len(response.ToolCalls) == 0 {
			log.Info().Msg("No tool calls in response, returning final answer")
			response.IsFinal = true
			return response, nil
		}

		// Add assistant message to history
		assistantMsg := Message{
			Role:      "assistant",
			Content:   response.Content,
			ToolCalls: response.ToolCalls,
		}
		messages = append(messages, assistantMsg)

		// Execute tool calls
		log.Info().
			Int("tool_calls_count", len(response.ToolCalls)).
			Msg("Executing tool calls")

		toolResults, err := s.ProcessToolCalls(ctx, sessionID, response.ToolCalls, autonomyMode)
		if err != nil {
			log.Error().Err(err).Msg("Failed to execute tool calls")
			return nil, fmt.Errorf("tool execution failed: %w", err)
		}

		// Check if all operations are queued for preview
		allQueued := true
		hasOperations := false
		log.Debug().
			Int("tool_results_count", len(toolResults)).
			Msg("Checking if all operations are queued")

		for i, result := range toolResults {
			if result.Content != nil {
				// Check if content is already a map
				if resultMap, ok := result.Content.(map[string]interface{}); ok {
					if status, ok := resultMap["status"].(string); ok {
						hasOperations = true
						log.Debug().
							Int("result_index", i).
							Str("status", status).
							Str("tool_id", result.ToolUseID).
							Msg("Found tool result with status (map)")
						if status != "queued" && status != "queued_for_preview" {
							allQueued = false
							break
						}
					}
				} else if contentStr, ok := result.Content.(string); ok && contentStr != "" {
					// If content is a string, try to parse it as JSON
					var resultData map[string]interface{}
					if err := json.Unmarshal([]byte(contentStr), &resultData); err == nil {
						if status, ok := resultData["status"].(string); ok {
							hasOperations = true
							log.Debug().
								Int("result_index", i).
								Str("status", status).
								Str("tool_id", result.ToolUseID).
								Msg("Found tool result with status (string)")
							if status != "queued" && status != "queued_for_preview" {
								allQueued = false
								break
							}
						}
					}
				}
			}
		}

		log.Debug().
			Bool("has_operations", hasOperations).
			Bool("all_queued", allQueued).
			Msg("Queue check complete")

		// If all operations are queued, return final response
		if hasOperations && allQueued {
			log.Info().
				Int("queued_operations", len(toolResults)).
				Msg("All operations queued for preview, returning final response")

			// Build a final response that includes the assistant's message content
			// and indicates that operations are queued for preview
			finalResponse := &CompletionResponse{
				Content:   response.Content,   // Include the assistant's explanation
				ToolCalls: response.ToolCalls, // Include the tool calls that were made
				IsFinal:   true,
				Usage:     response.Usage,
				Actions: []Action{
					{
						Type:        "preview_queued",
						Description: fmt.Sprintf("%d operations queued for preview", len(toolResults)),
					},
				},
			}

			// Important: Return here to exit the loop and prevent further processing
			return finalResponse, nil
		}

		// Add tool results to messages
		toolResultMsg := Message{
			Role:        "user",
			ToolResults: toolResults,
		}
		messages = append(messages, toolResultMsg)

		// Refresh context after tool execution to get latest state
		if context != nil && s.contextBuilder != nil {
			refreshedContext, err := s.RefreshContext(ctx, sessionID, context)
			if err == nil {
				context = refreshedContext
				log.Info().Msg("Context refreshed after tool execution")
				
				// Rebuild messages with refreshed context for next round
				if s.promptBuilder != nil && round < maxRounds-1 {
					// Get all messages except the system message
					var historyWithoutSystem []Message
					for _, msg := range messages {
						if msg.Role != "system" {
							historyWithoutSystem = append(historyWithoutSystem, msg)
						}
					}
					
					// Rebuild with fresh context
					newMessages := s.promptBuilder.BuildPromptWithHistory("", context, historyWithoutSystem)
					
					// Replace messages, but keep the last user message (tool results)
					if len(messages) > 0 && messages[len(messages)-1].Role == "user" && messages[len(messages)-1].ToolResults != nil {
						lastMsg := messages[len(messages)-1]
						messages = newMessages[:len(newMessages)-1] // Remove empty user message from BuildPromptWithHistory
						messages = append(messages, lastMsg)
					} else {
						messages = newMessages
					}
					
					log.Info().
						Int("messages_count", len(messages)).
						Msg("Rebuilt messages with refreshed context")
				}
			} else {
				log.Warn().Err(err).Msg("Failed to refresh context, continuing with existing")
			}
		}
	}

	return nil, fmt.Errorf("exceeded maximum rounds of tool use")
}

// ProcessChatWithToolsAndHistoryStreaming - streaming version
func (s *Service) ProcessChatWithToolsAndHistoryStreaming(
	ctx context.Context,
	sessionID string,
	userMessage string,
	context *FinancialContext,
	chatHistory []Message,
	autonomyMode string,
) (<-chan CompletionChunk, error) {
	// Create output channel
	outChan := make(chan CompletionChunk, 10)
	
	// Start processing in a goroutine
	go func() {
		defer close(outChan)
		
		// Build initial messages
		messages := []Message{}
		
		// Add system prompt
		systemPrompt := s.buildSystemPrompt(context)
		messages = append(messages, Message{
			Role:    "system",
			Content: systemPrompt,
		})
		
		// Add chat history
		messages = append(messages, chatHistory...)
		
		// Add current user message
		messages = append(messages, Message{
			Role:    "user",
			Content: userMessage,
		})
		
		// Process with tool continuation support
		s.streamWithToolContinuation(ctx, sessionID, messages, context, autonomyMode, outChan)
	}()
	
	return outChan, nil
}

// streamWithToolContinuation handles streaming with proper tool execution and continuation
func (s *Service) streamWithToolContinuation(
	ctx context.Context,
	sessionID string,
	messages []Message,
	context *FinancialContext,
	autonomyMode string,
	outChan chan<- CompletionChunk,
) {
	const maxIterations = 5 // Prevent infinite loops
	
	for iteration := 0; iteration < maxIterations; iteration++ {
		// Get relevant tools
		tools := s.getRelevantTools(messages[len(messages)-1].Content, context)
		
		log.Info().
			Str("session", sessionID).
			Int("tools_count", len(tools)).
			Str("autonomy_mode", autonomyMode).
			Int("iteration", iteration).
			Msg("Starting streaming iteration with tools")
		
		// Create request with streaming enabled
		request := CompletionRequest{
			Messages:  messages,
			MaxTokens: 4096,
			Tools:     tools,
			Stream:    true,
		}
		
		// Set tool choice based on autonomy mode
		switch autonomyMode {
		case "ask":
			request.ToolChoice = &ToolChoice{Type: "none"}
		case "auto":
			request.ToolChoice = &ToolChoice{Type: "auto"}
		case "full":
			request.ToolChoice = &ToolChoice{Type: "any"}
		}
		
		// Get streaming response
		providerChan, err := s.provider.GetStreamingCompletion(ctx, request)
		if err != nil {
			// Send error chunk
			outChan <- CompletionChunk{
				Type:  "error",
				Error: err,
				Done:  true,
			}
			return
		}
		
		// Track assistant message content and tool calls
		var assistantContent strings.Builder
		var toolCalls []ToolCall
		var currentToolCall *ToolCall
		hasQueuedTools := false
		
		// Forward chunks and collect tool calls
		for chunk := range providerChan {
			// Forward the chunk
			select {
			case outChan <- chunk:
			case <-ctx.Done():
				return
			}
			
			// Collect content and tool calls
			switch chunk.Type {
			case "text":
				if chunk.Delta != "" {
					assistantContent.WriteString(chunk.Delta)
				}
				
			case "tool_start":
				if chunk.ToolCall != nil {
					currentToolCall = &ToolCall{
						ID:    chunk.ToolCall.ID,
						Name:  chunk.ToolCall.Name,
						Input: make(map[string]interface{}),
					}
				}
				
			case "tool_progress":
				if currentToolCall != nil && chunk.Delta != "" {
					// Parse and merge the JSON delta
					var deltaData map[string]interface{}
					if err := json.Unmarshal([]byte(chunk.Delta), &deltaData); err == nil {
						for k, v := range deltaData {
							currentToolCall.Input[k] = v
						}
					}
				}
				
			case "tool_complete":
				if currentToolCall != nil {
					toolCalls = append(toolCalls, *currentToolCall)
					currentToolCall = nil
				}
			}
			
			// Check if this is the final chunk
			if chunk.Done {
				// If we have tool calls, we need to check if they're all queued
				if len(toolCalls) > 0 {
					// Add assistant message to history
					assistantMsg := Message{
						Role:      "assistant",
						Content:   assistantContent.String(),
						ToolCalls: toolCalls,
					}
					messages = append(messages, assistantMsg)
					
					// Check if all tools return queued status
					for _, tc := range toolCalls {
						// Note: In the actual implementation, we would need to check
						// the tool results that were sent as tool_result chunks
						// For now, we'll check if it's organize_financial_model
						if tc.Name == "organize_financial_model" {
							hasQueuedTools = true
						}
					}
					
					// If we have queued tools and this is not the last iteration,
					// continue the conversation
					if hasQueuedTools && iteration < maxIterations-1 {
						log.Info().
							Str("session", sessionID).
							Int("iteration", iteration).
							Int("queued_tools", len(toolCalls)).
							Msg("Tools returned queued status, continuing conversation")
						
						// Add a tool result message to continue the conversation
						// This simulates the tool results being added to the conversation
						toolResultMsg := Message{
							Role: "user",
							Content: "The financial model organization has been queued for your approval. Please continue with creating the DCF model content and formulas.",
						}
						messages = append(messages, toolResultMsg)
						
						// Continue to next iteration
						break
					}
				}
				
				// No more iterations needed
				return
			}
		}
	}
	
	// Send final chunk if we hit max iterations
	outChan <- CompletionChunk{
		Type: "",
		Done: true,
	}
}

// SetAdvancedComponents wires up the advanced AI components (memory, context analyzer, orchestrator)
func (s *Service) SetAdvancedComponents(memoryService *FinancialMemoryService, contextAnalyzer *FinancialModelAnalyzer, toolOrchestrator *ToolOrchestrator) {
	s.memoryService = memoryService
	s.contextAnalyzer = contextAnalyzer
	s.toolOrchestrator = toolOrchestrator

	log.Info().
		Bool("memory_service", memoryService != nil).
		Bool("context_analyzer", contextAnalyzer != nil).
		Bool("tool_orchestrator", toolOrchestrator != nil).
		Msg("Advanced AI components configured")
}

// SetContextBuilder sets the context builder for dynamic context refresh
func (s *Service) SetContextBuilder(contextBuilder interface{}) {
	s.contextBuilder = contextBuilder
}

// SetQueuedOperationRegistry sets the queued operation registry
func (s *Service) SetQueuedOperationRegistry(registry interface{}) {
	s.queuedOpsRegistry = registry
}

// RefreshContext refreshes the financial context after tool execution
func (s *Service) RefreshContext(ctx context.Context, sessionID string, currentContext *FinancialContext) (*FinancialContext, error) {
	log.Info().
		Str("session_id", sessionID).
		Bool("has_context_builder", s.contextBuilder != nil).
		Bool("has_queued_ops_registry", s.queuedOpsRegistry != nil).
		Bool("has_current_context", currentContext != nil).
		Msg("Starting context refresh")

	if s.contextBuilder == nil {
		log.Warn().Msg("No context builder available, returning current context")
		return currentContext, nil
	}

	// Use type assertion to call BuildContext method
	if builder, ok := s.contextBuilder.(interface {
		BuildContext(context.Context, string) (*FinancialContext, error)
	}); ok {
		// Get fresh context
		newContext, err := builder.BuildContext(ctx, sessionID)
		if err != nil {
			log.Error().Err(err).Msg("Failed to refresh context")
			return currentContext, err
		}

		// Log what changed
		if currentContext != nil && newContext != nil {
			log.Debug().
				Int("old_cell_count", len(currentContext.CellValues)).
				Int("new_cell_count", len(newContext.CellValues)).
				Str("old_selection", currentContext.SelectedRange).
				Str("new_selection", newContext.SelectedRange).
				Bool("model_type_changed", currentContext.ModelType != newContext.ModelType).
				Msg("Context differences after refresh")
		}

		// Add pending operations if registry is available
		if s.queuedOpsRegistry != nil {
			log.Debug().Msg("Checking queued operations registry")
			if registry, ok := s.queuedOpsRegistry.(interface {
				GetOperationSummary(context.Context, string) map[string]interface{}
			}); ok {
				opSummary := registry.GetOperationSummary(ctx, sessionID)
				newContext.PendingOperations = opSummary

				log.Info().
					Interface("pending_ops_summary", opSummary).
					Msg("Added pending operations to context")
			} else {
				log.Warn().Msg("QueuedOpsRegistry doesn't implement GetOperationSummary")
			}
		}

		log.Info().
			Str("session_id", sessionID).
			Bool("has_pending_ops", newContext.PendingOperations != nil).
			Int("cell_count", len(newContext.CellValues)).
			Str("model_type", newContext.ModelType).
			Msg("Context refreshed successfully")

		return newContext, nil
	}

	log.Error().Msg("Context builder doesn't implement BuildContext interface")
	return currentContext, fmt.Errorf("context builder interface not implemented")
}

// ProcessIntelligentChatMessage processes a chat message using advanced AI components
func (s *Service) ProcessIntelligentChatMessage(ctx context.Context, sessionID string, userMessage string, context *FinancialContext) (*CompletionResponse, error) {
	// If advanced components are available, use the orchestrator for intelligent processing
	if s.toolOrchestrator != nil && s.contextAnalyzer != nil {
		log.Info().
			Str("session", sessionID).
			Msg("Using intelligent tool orchestration for chat processing")

		// Use the tool orchestrator for intelligent processing
		orchestrationResult, err := s.toolOrchestrator.ExecuteFinancialModelingRequest(ctx, sessionID, userMessage)
		if err != nil {
			log.Error().Err(err).Msg("Intelligent orchestration failed, falling back to standard processing")
			// Fall back to standard processing
			return s.ProcessChatMessage(ctx, userMessage, context)
		}

		// Convert orchestration result to completion response
		response := &CompletionResponse{
			Content: fmt.Sprintf("Task completed successfully using intelligent orchestration. %d tools executed.", len(orchestrationResult.ToolResults)),
			Usage: Usage{
				PromptTokens:     1000, // Estimated
				CompletionTokens: 500,  // Estimated
				TotalTokens:      1500, // Estimated
			},
		}

		return response, nil
	}

	// Fall back to standard processing if advanced components not available
	return s.ProcessChatMessage(ctx, userMessage, context)
}

// GetMemoryService returns the financial memory service
func (s *Service) GetMemoryService() *FinancialMemoryService {
	return s.memoryService
}

// buildSystemPrompt builds the system prompt based on the financial context
func (s *Service) buildSystemPrompt(context *FinancialContext) string {
	if s.promptBuilder != nil && context != nil {
		// Use the prompt builder to generate a context-aware system prompt
		messages := s.promptBuilder.BuildChatPrompt("", context)
		if len(messages) > 0 && messages[0].Role == "system" {
			return messages[0].Content
		}
	}
	
	// Default system prompt
	return "You are a financial modeling assistant helping with spreadsheet analysis and calculations. Provide accurate financial insights and calculations."
}

// getRelevantTools returns tools relevant to the user message and context
func (s *Service) getRelevantTools(userMessage string, context *FinancialContext) []ExcelTool {
	// For now, return all available Excel tools
	// TODO: Implement intelligent tool selection based on message content and context
	return GetExcelTools()
}

// GetContextAnalyzer returns the context analyzer
func (s *Service) GetContextAnalyzer() *FinancialModelAnalyzer {
	return s.contextAnalyzer
}

// GetToolOrchestrator returns the tool orchestrator
func (s *Service) GetToolOrchestrator() *ToolOrchestrator {
	return s.toolOrchestrator
}

// detectSpecificToolRequest analyzes the user message to determine if they're asking for a specific tool
func (s *Service) detectSpecificToolRequest(userMessage string) string {
	msg := strings.ToLower(userMessage)
	
	// Check for specific tool patterns
	if strings.Contains(msg, "read") && (strings.Contains(msg, "range") || strings.Contains(msg, "cell") || strings.Contains(msg, "value")) {
		return "read_range"
	}
	if strings.Contains(msg, "write") && (strings.Contains(msg, "range") || strings.Contains(msg, "cell") || strings.Contains(msg, "value")) {
		return "write_range"
	}
	if strings.Contains(msg, "formula") && (strings.Contains(msg, "create") || strings.Contains(msg, "write") || strings.Contains(msg, "set")) {
		return "write_formula"
	}
	if strings.Contains(msg, "format") && (strings.Contains(msg, "apply") || strings.Contains(msg, "set") || strings.Contains(msg, "change")) {
		return "apply_formatting"
	}
	if strings.Contains(msg, "chart") && (strings.Contains(msg, "create") || strings.Contains(msg, "make") || strings.Contains(msg, "generate")) {
		return "create_chart"
	}
	if strings.Contains(msg, "pivot") && (strings.Contains(msg, "create") || strings.Contains(msg, "make") || strings.Contains(msg, "generate")) {
		return "create_pivot_table"
	}
	if strings.Contains(msg, "conditional format") || (strings.Contains(msg, "conditional") && strings.Contains(msg, "formatting")) {
		return "apply_conditional_formatting"
	}
	if strings.Contains(msg, "named range") || (strings.Contains(msg, "name") && strings.Contains(msg, "range")) {
		return "create_named_range"
	}
	if strings.Contains(msg, "data validation") || (strings.Contains(msg, "validate") && strings.Contains(msg, "data")) {
		return "add_data_validation"
	}
	if strings.Contains(msg, "comment") && (strings.Contains(msg, "add") || strings.Contains(msg, "insert")) {
		return "add_comment"
	}
	if strings.Contains(msg, "sheet") && (strings.Contains(msg, "create") || strings.Contains(msg, "add") || strings.Contains(msg, "new")) {
		return "create_sheet"
	}
	if strings.Contains(msg, "sheet") && (strings.Contains(msg, "rename") || strings.Contains(msg, "name")) {
		return "rename_sheet"
	}
	if strings.Contains(msg, "sheet") && (strings.Contains(msg, "delete") || strings.Contains(msg, "remove")) {
		return "delete_sheet"
	}
	if strings.Contains(msg, "copy") && (strings.Contains(msg, "range") || strings.Contains(msg, "cell")) {
		return "copy_range"
	}
	if strings.Contains(msg, "merge") && (strings.Contains(msg, "cell") || strings.Contains(msg, "range")) {
		return "merge_cells"
	}
	if strings.Contains(msg, "sort") && (strings.Contains(msg, "data") || strings.Contains(msg, "range")) {
		return "sort_range"
	}
	if strings.Contains(msg, "filter") && (strings.Contains(msg, "apply") || strings.Contains(msg, "set") || strings.Contains(msg, "add")) {
		return "apply_filter"
	}
	if strings.Contains(msg, "freeze") && (strings.Contains(msg, "pane") || strings.Contains(msg, "row") || strings.Contains(msg, "column")) {
		return "freeze_panes"
	}
	if strings.Contains(msg, "protect") && (strings.Contains(msg, "range") || strings.Contains(msg, "sheet")) {
		return "protect_range"
	}
	if strings.Contains(msg, "link") && (strings.Contains(msg, "cell") || strings.Contains(msg, "sheet")) {
		return "link_cells"
	}
	
	return ""
}
