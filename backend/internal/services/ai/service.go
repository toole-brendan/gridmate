package ai

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/sirupsen/logrus"
)

// Service represents the main AI service
type Service struct {
	provider         AIProvider
	promptBuilder    *PromptBuilder
	toolExecutor     *ToolExecutor
	memoryService    *FinancialMemoryService
	contextAnalyzer  *FinancialModelAnalyzer
	toolOrchestrator *ToolOrchestrator
	config           ServiceConfig
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
		Provider:        getEnvOrDefault("AI_PROVIDER", "anthropic"),
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

// ProcessToolCalls processes tool calls from an AI response
func (s *Service) ProcessToolCalls(ctx context.Context, sessionID string, toolCalls []ToolCall) ([]ToolResult, error) {
	if s.toolExecutor == nil {
		return nil, fmt.Errorf("tool executor not configured")
	}

	results := make([]ToolResult, 0, len(toolCalls))
	
	for _, toolCall := range toolCalls {
		result, err := s.toolExecutor.ExecuteTool(ctx, sessionID, toolCall)
		if err != nil {
			log.Error().Err(err).Str("tool", toolCall.Name).Msg("Failed to execute tool")
			// Add error result
			results = append(results, *result)
		} else {
			results = append(results, *result)
		}
	}

	return results, nil
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
			case "write_range", "apply_formula", "format_range":
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
			case "read_range", "write_range", "apply_formula", "analyze_data":
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

		// If no tool calls, return the response
		if len(response.ToolCalls) == 0 {
			log.Info().Msg("No tool calls in response, returning final answer")
			return response, nil
		}

		// Process tool calls
		toolResults, err := s.ProcessToolCalls(ctx, sessionID, response.ToolCalls)
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
func (s *Service) ProcessChatWithToolsAndHistory(ctx context.Context, sessionID string, userMessage string, context *FinancialContext, chatHistory []Message, autonomyMode string) (*CompletionResponse, error) {
	log.Info().
		Str("session_id", sessionID).
		Str("user_message", userMessage).
		Bool("has_context", context != nil).
		Int("history_length", len(chatHistory)).
		Str("autonomy_mode", autonomyMode).
		Msg("Starting ProcessChatWithToolsAndHistory")

	// Build messages array with history
	messages := make([]Message, 0, len(chatHistory)+1)
	
	// Add chat history
	for _, msg := range chatHistory {
		messages = append(messages, Message{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}
	
	// Add current user message
	messages = append(messages, Message{Role: "user", Content: userMessage})
	
	// Add context if provided
	if context != nil && context.ModelType == "" {
		context.ModelType = s.promptBuilder.DetectModelType(context)
	}

	// If we have context and no history, build the full prompt with context
	if context != nil && len(chatHistory) == 0 {
		messages = s.promptBuilder.BuildChatPrompt(userMessage, context)
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
		
		toolResults, err := s.ProcessToolCalls(ctx, sessionID, response.ToolCalls)
		if err != nil {
			log.Error().Err(err).Msg("Failed to execute tool calls")
			return nil, fmt.Errorf("tool execution failed: %w", err)
		}

		// Add tool results to messages
		toolResultMsg := Message{
			Role:        "user",
			ToolResults: toolResults,
		}
		messages = append(messages, toolResultMsg)
	}

	return nil, fmt.Errorf("exceeded maximum rounds of tool use")
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

// GetContextAnalyzer returns the context analyzer
func (s *Service) GetContextAnalyzer() *FinancialModelAnalyzer {
	return s.contextAnalyzer
}

// GetToolOrchestrator returns the tool orchestrator
func (s *Service) GetToolOrchestrator() *ToolOrchestrator {
	return s.toolOrchestrator
}