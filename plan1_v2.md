# Final Implementation Plan: Live Context Token Counter

This document provides a comprehensive, updated plan for integrating a real-time context token counter into the Gridmate chat interface. This plan is the result of a detailed analysis of the existing codebase, and it refines the initial proposal to ensure a seamless and robust implementation that aligns with the project's current architecture.

The final feature will provide users with a clear, intuitive "Context: X / 200,000 tokens" indicator, mirroring the user experience of advanced AI tools like Cline and enhancing transparency into the AI's context utilization.

---

## 1. Backend: Flexible Model Configuration

**Goal:** Establish a flexible and centralized way to define the AI model's maximum context window size, ensuring it can be easily updated or configured for different models in the future.

Based on the analysis of `backend/internal/config/config.go`, the best approach is to enhance the existing `AIConfig` struct rather than introducing a separate map. This aligns with the current configuration pattern and allows for easy management via environment variables.

**File to Modify:** `backend/internal/config/config.go`

**Implementation Details:**

1.  **Extend `AIConfig`:** We will add a new field, `ContextWindowSize int`, to the `AIConfig` struct. This provides a dedicated, typed field for this crucial value.

2.  **Load from Environment:** In the `Load()` function, we will populate this new field from the environment variable `AI_CONTEXT_WINDOW_SIZE`. To ensure the application works out-of-the-box for the target model, we will set the default value to `200000`, the known context window for Claude 3.5 Sonnet.

This approach makes the context window size a first-class configuration citizen, just like `MaxTokens` or `Temperature`.

```go
// In backend/internal/config/config.go

// AIConfig holds AI service configuration
type AIConfig struct {
	Provider            string
	Model               string
	StreamingMode       bool
	MaxTokens           int
	Temperature         float32
	TopP                float32
	RequestTimeout      time.Duration
	RetryDelay          time.Duration
	EnableActions       bool
	EnableEmbedding     bool
	ContextWindowSize   int // <-- This new field will hold the 200,000 token limit.
	// Provider-specific configs
	AnthropicAPIKey     string
	AzureOpenAIKey      string
	AzureOpenAIEndpoint string
	// Additional timeout configurations
	ToolRequestTimeout time.Duration
	ChatRequestTimeout time.Duration
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		// ...
		AI: AIConfig{
			// ...
			EnableEmbedding:     getEnvAsBool("AI_ENABLE_EMBEDDING", true),
			// We'll load the context size from the environment, with a default of 200k.
			ContextWindowSize:   getEnvAsInt("AI_CONTEXT_WINDOW_SIZE", 200000), // <-- Load the value here.
			AnthropicAPIKey:     getEnv("ANTHROPIC_API_KEY", ""),
			// ...
		},
	}
	// ...
	return cfg, nil
}
```

---

## 2. Backend: Accurate Token Counting

**Goal:** Implement a reliable method within the `AnthropicProvider` to count the number of tokens in a prompt *before* it is sent to the AI.

The existing `anthropic.go` file handles communication with the Anthropic API but lacks a dedicated token counting function. While the API response helpfully includes the output token count, we must calculate the input tokens ourselves to provide a complete picture to the user.

**File to Modify:** `backend/internal/services/ai/anthropic.go`

**Implementation Details:**

We will introduce a new `CountTokens` method on the `AnthropicProvider`. The ideal implementation would use an official Anthropic SDK function or a dedicated token counting API endpoint if one exists. As a robust fallback for this plan, we will implement a heuristic-based counter (averaging 4 characters per token). This provides a reasonable estimate and can be easily replaced with a more precise method later without changing the service-level logic.

```go
// In backend/internal/services/ai/anthropic.go

// ... (imports and existing structs)

// CountTokens estimates the number of tokens for a given request. This is a crucial
// function for providing the "input" part of the token counter.
func (a *AnthropicProvider) CountTokens(ctx context.Context, request CompletionRequest) (int, error) {
	// The ideal implementation would use an official SDK method or a dedicated API endpoint.
	// As a practical starting point, we'll use a well-known heuristic.
	// This makes the feature functional immediately and easy to upgrade later.

	anthropicRequest := a.convertToAnthropicRequest(request)
	
	var totalChars int
	// Sum characters from all user and assistant messages.
	for _, msg := range anthropicRequest.Messages {
		// Content can be of different types, so we handle text content specifically.
		if textContent, ok := msg.Content.(anthropicTextContent); ok {
			totalChars += len(textContent)
		}
        // A more advanced implementation would also count tokens from tool definitions.
	}
    // Add characters from the system prompt.
    if anthropicRequest.System != "" {
        totalChars += len(anthropicRequest.System)
    }

	// The ~4 characters/token heuristic is a standard industry approximation.
	estimatedTokens := totalChars / 4
	
	log.Debug().Int("estimated_tokens", estimatedTokens).Msg("Estimated input tokens using character count heuristic")
	return estimatedTokens, nil
}

// ... (rest of the file)
```

---

## 3. Backend: Integrating the Pipeline

**Goal:** Seamlessly weave token counting into the main chat processing workflow, calculate usage for every turn, and attach this data to the response sent to the frontend.

The core logic for handling chat messages resides in `ProcessChatWithToolsAndHistory` within the AI service. This is the perfect place to orchestrate the token counting and data packaging.

**Files to Modify:**
*   `backend/internal/services/types.go` (for the shared data structure)
*   `backend/internal/services/excel_bridge.go` (to modify the response payload)
*   `backend/internal/services/ai/service.go` (for the main logic)

**Implementation Details:**

1.  **Create a Shared `TokenUsage` Struct:** To ensure type safety and consistency, we'll define a `TokenUsage` struct in `types.go` that will be used across the backend and serialized into the JSON response.

2.  **Update the `ChatResponse` Payload:** We'll add the new `TokenUsage` struct to the `ChatResponse` in `excel_bridge.go`, making it a formal part of the communication contract with the frontend.

3.  **Orchestrate in the AI Service:** In `ProcessChatWithToolsAndHistory`, we will:
    a.  Call our new `CountTokens` method to get the `inputTokens` before making the API call to Claude.
    b.  After receiving the response, retrieve the `completionTokens` from the provider's usage data.
    c.  Populate our `TokenUsage` struct with the input count, output count, their sum, and the `ContextWindowSize` from our new config setting.
    d.  Attach this fully populated struct to the `CompletionResponse` that is returned to the `excel_bridge`.

4.  **Forward to Client:** The `excel_bridge` will then take this `TokenUsage` object from the AI service's response and place it into the `ChatResponse` sent over the WebSocket to the frontend.

This end-to-end flow ensures that with every single message-response cycle, the frontend receives a fresh, complete `TokenUsage` object.

```go
// Step 1: In backend/internal/services/types.go
package services

// TokenUsage holds information about AI model token consumption for a single turn.
// This struct will be serialized to JSON and sent to the frontend.
type TokenUsage struct {
	Input  int `json:"input"`
	Output int `json:"output"`
	Total  int `json:"total"`
	Max    int `json:"max"`
}

// Step 2: In backend/internal/services/excel_bridge.go
type ChatResponse struct {
	Content     string           `json:"content"`
	Suggestions []string         `json:"suggestions,omitempty"`
	Actions     []ProposedAction `json:"actions,omitempty"`
	SessionID   string           `json:"sessionId"`
	IsFinal     bool             `json:"isFinal"`
	TokenUsage  *TokenUsage      `json:"tokenUsage,omitempty"` // <-- Add this field
}

// Step 3 & 4: In backend/internal/services/ai/service.go and excel_bridge.go (conceptual flow)

// In ai/service.go's ProcessChatWithToolsAndHistory:
// ...
// 1. Count input tokens
inputTokens, _ := s.provider.CountTokens(ctx, request)

// 2. Get completion from provider
response, err := s.provider.GetCompletion(ctx, request)

// 3. Populate usage data in the response
response.Usage.PromptTokens = inputTokens
response.Usage.TotalTokens = inputTokens + response.Usage.CompletionTokens
response.Usage.MaxTokens = s.config.ContextWindowSize // Use configured max size
// ...
// return response

// In excel_bridge.go's ProcessChatMessage:
// ...
// aiResponse, err := eb.aiService.ProcessChatWithToolsAndHistory(...)
// ...
// 4. Create the tokenUsage object for the final payload
tokenUsage := &TokenUsage{
    Input:  aiResponse.Usage.PromptTokens,
    Output: aiResponse.Usage.CompletionTokens,
    Total:  aiResponse.Usage.TotalTokens,
    Max:    aiResponse.Usage.MaxTokens,
}
// ...
// 5. Attach it to the final response
finalResponse := &ChatResponse{
    // ...,
    TokenUsage: tokenUsage,
}
// return finalResponse
```

---

## 4. Frontend: Centralized State Management

**Goal:** Prepare the frontend to receive, store, and manage the `tokenUsage` data.

Our analysis identified that the application's state is managed via a set of custom React hooks. We will extend `useChatManager` to hold the token usage state and `useMessageHandlers` to process the incoming data from the backend.

**Files to Modify:**
*   `excel-addin/src/hooks/useChatManager.ts` (or equivalent state hook)
*   `excel-addin/src/hooks/useMessageHandlers.ts` (or equivalent message processing hook)

**Implementation Details:**

1.  **Define Frontend Type:** Create a `TokenUsage` interface on the frontend to match the backend struct.
2.  **Extend `useChatManager`:** Add a new `useState` hook to manage the `tokenUsage` object. We'll initialize it with default values so the UI can render correctly from the start. The hook will expose both the state variable and its setter function.
3.  **Update `useMessageHandlers`:** In the main message handler function that processes incoming SignalR messages, we will check for the `tokenUsage` field in any `chat_response`. If present, we will call the `setTokenUsage` function from `useChatManager` to update the application's state, triggering a UI re-render.

```typescript
// In a shared types file or directly in useChatManager.ts
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  max: number;
}

// In excel-addin/src/hooks/useChatManager.ts
// ...
export const useChatManager = () => {
  // ...
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    input: 0,
    output: 0,
    total: 0,
    max: 200000, // Initialize with a sensible default
  });

  return {
    // ...
    tokenUsage,
    setTokenUsage,
  };
};

// In excel-addin/src/hooks/useMessageHandlers.ts
// ...
export const useMessageHandlers = (chatManager, /*...*/) => {
  const handleSignalRMessage = useCallback((message: any) => {
    if (message.type === 'chat_response' && message.data.tokenUsage) {
      // When a chat response arrives, update the token usage state.
      chatManager.setTokenUsage(message.data.tokenUsage);
    }
    // ...
  }, [chatManager]);
  // ...
};
```

---

## 5. Frontend: Building the User Interface

**Goal:** Create a polished, reusable React component to display the token counter and integrate it into the main chat view.

We will create a new, dedicated `TokenCounter` component to encapsulate the display logic. This component will then be rendered within the `EnhancedChatInterface`, receiving the `tokenUsage` state as a prop.

**Files to Modify:**
*   `excel-addin/src/components/chat/TokenCounter.tsx` (New File)
*   `excel-addin/src/components/chat/RefactoredChatInterface.tsx` (To pass props)
*   `excel-addin/src/components/chat/EnhancedChatInterface.tsx` (To render the component)

**Implementation Details:**

1.  **Create `TokenCounter.tsx`:** This component will be responsible for the entire visual representation of the counter. It will display the "Context: X / Y tokens" text, the input (↑) and output (↓) counts, and a thin progress bar that visually represents the percentage of the context window used. It will be styled using Tailwind CSS to match the application's existing design language.

2.  **Prop Drilling:** The `tokenUsage` state will be passed down from `RefactoredChatInterface.tsx` (where the `useChatManager` hook is used) to its child, `EnhancedChatInterface.tsx`.

3.  **Render the Component:** Inside `EnhancedChatInterface.tsx`, we will render the `<TokenCounter />` component. A strategic location is just above the main chat input area, ensuring it's always visible but doesn't interfere with the message flow. It will only render when `total` tokens are greater than zero, keeping the initial UI clean.

```tsx
// Step 1: Create excel-addin/src/components/chat/TokenCounter.tsx
import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { TokenUsage } from '../../hooks/useChatManager';

interface TokenCounterProps {
  usage: TokenUsage;
}

export const TokenCounter: React.FC<TokenCounterProps> = ({ usage }) => {
  const { input, output, total, max } = usage;
  // Calculate fill percentage for the progress bar.
  const percentage = max > 0 ? (total / max) * 100 : 0;

  // Don't render the component until the first tokens are used.
  if (total === 0) return null;

  return (
    <div className="px-4 pt-2 pb-1 text-xs text-text-secondary font-sans">
      <div className="flex justify-between items-center mb-1">
        <span className="font-medium">Context: {total.toLocaleString()} / {max.toLocaleString()} tokens</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="Input Tokens">
            <ArrowUp size={12} className="text-text-tertiary" />
            {input.toLocaleString()}
          </span>
          <span className="flex items-center gap-1" title="Output Tokens">
            <ArrowDown size={12} className="text-text-tertiary" />
            {output.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="w-full bg-secondary-background rounded-full h-1" title={`${percentage.toFixed(2)}% used`}>
        <div
          className="bg-blue-500 h-1 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Step 2 & 3: In EnhancedChatInterface.tsx
// ...
import { TokenCounter } from './TokenCounter';
import { TokenUsage } from '../../hooks/useChatManager';

interface EnhancedChatInterfaceProps {
  // ...
  tokenUsage?: TokenUsage;
}

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({ tokenUsage, ... }) => {
  // ...
  return (
    // ...
    <div className="border-t border-border-primary bg-app-background">
      {/* Render the token counter if the data is available */}
      {tokenUsage && <TokenCounter usage={tokenUsage} />}
      
      {/* The rest of the input area */}
      <div className="px-4 pt-3 pb-2 ...">
        {/* ... */}
      </div>
    </div>
    // ...
  );
};
```

---

## Conclusion

By executing this plan, we will successfully deliver a high-quality, user-facing feature that significantly enhances the Gridmate product. The live token counter will provide critical transparency, empower users to manage their interactions with the AI more effectively, and align Gridmate's capabilities with best-in-class AI-powered developer tools. The implementation is designed to be robust, maintainable, and seamlessly integrated into the existing application architecture.