# **UPDATED: Gridmate Memory & Context Persistence Implementation Plan**

## **1. Introduction: The Goal of Perfect Conversational Memory**

To elevate Gridmate from a simple command-response tool to a true AI partner, it must possess a flawless memory. Like human analysts, it needs to recall the entire history of a conversation and remain constantly aware of the evolving state of the spreadsheet. The current implementation falls short, leading to frustratingly forgetful behavior where the AI loses track of its own instructions and the user's prior messages.

This document outlines a comprehensive plan to re-architect Gridmate’s context and memory systems. Our strategy is modeled on best practices from leading AI-powered developer tools like **Cline** and **Roo-code**, which excel at maintaining state. We will ensure that every interaction with the AI is fully informed by a "Memory Bank" comprising three critical components:

1.  **Core Identity:** A consistent set of system instructions defining the AI's role and capabilities.
2.  **Live Spreadsheet Context:** An up-to-the-minute snapshot of the user's Excel or Google Sheet, including selections, values, and recent changes.
3.  **Full Conversation History:** The complete, ordered log of the current user-assistant dialogue.

By fixing the application's broken prompt construction pipeline, we will achieve a stateful and coherent AI, capable of handling complex, multi-turn financial modeling tasks.

## **2. The Diagnosis: Uncovering the Root of Forgetfulness**

Our investigation into the codebase has confirmed several critical flaws that collectively break the application's memory.

*   **Fatal Flaw 1: Amnesiac System Prompts**
    *   **Problem:** The `prompt_builder.go` file incorrectly constructs two separate system messages. The first provides the AI's core instructions, but the second, containing the spreadsheet context, immediately follows.
    *   **Root Cause:** The `anthropic.go` provider, which sends the final request to the Claude API, is designed to only accept a single system prompt. In its current implementation, it dutifully processes both messages, but the content of the second message simply **overwrites the first**.
    *   **Impact:** The AI literally forgets its own identity and instructions on every turn, receiving only the spreadsheet context as its guide.

*   **Fatal Flaw 2: One-Time Context Injection**
    *   **Problem:** The AI only receives spreadsheet context on the very first message of a session. Any subsequent changes made by the user or the AI are invisible in later turns.
    *   **Root Cause:** A misplaced condition in `ai/service.go` (`if context != nil && len(chatHistory) == 0`) explicitly prevents the `FinancialContext` from being included in any request after the first one.
    *   **Impact:** The AI is effectively blindfolded after its first interaction, operating on stale data and unable to follow up on its own previous actions.

*   **Fatal Flaw 3: The First-Turn Race Condition**
    *   **Problem:** The "first-turn" logic, designed to inject the initial context, is defeated by a subtle race condition.
    *   **Root Cause:** In `excel_bridge.go`, the user's new message is added to the chat history *before* the AI service is called. Consequently, when the `len(chatHistory) == 0` check is performed, the history length is already `1`.
    *   **Impact:** The condition for adding initial context fails, meaning **no spreadsheet context is ever sent on the first turn**, compounding the other flaws.

## **3. The Cure: A Refined Implementation Strategy**

### **Phase 1: Repairing the Prompt Construction Pipeline**

The first and most critical step is to ensure the AI receives a single, coherent set of instructions.

**File to Modify:** `backend/internal/services/ai/prompt_builder.go`

**The Task:** We will modify the `BuildChatPrompt` and `BuildAnalysisPrompt` functions. Instead of creating a second system message for context, we will **append the context directly to the main system prompt string**. This ensures that the Anthropic provider receives one unified message containing both the AI's identity and the spreadsheet's state.

**Conceptual Code Fix:**
```go
// In prompt_builder.go...
func (pb *PromptBuilder) BuildChatPrompt(userMessage string, context *FinancialContext) []Message {
    // Start with the base system prompt.
    systemContent := pb.systemPrompt

    // Append the financial context to the same system message string.
    if context != nil {
        contextPrompt := pb.buildContextPrompt(context)
        if contextPrompt != "" {
            systemContent += "\n\nCurrent Context:\n" + contextPrompt
        }
    }

    // Create a single, unified system message.
    messages := []Message{
        {Role: "system", Content: systemContent},
        {Role: "user", Content: userMessage},
    }

    return messages
}
```

### **Phase 2: Centralizing Logic for Persistent, Stateful Context**

To eliminate special cases and ensure context is always current, we will refactor the application to follow a single, authoritative logic path for all chat messages.

**File to Modify:** `backend/internal/services/ai/service.go`

**The Task:** We will overhaul `ProcessChatWithToolsAndHistory` to make it the definitive engine for prompt construction. It will no longer have a special "first-turn" condition. Instead, on *every* call, it will be responsible for assembling the complete prompt from scratch.

**New `ProcessChatWithToolsAndHistory` Logic:**
```go
// In ai/service.go...
func (s *Service) ProcessChatWithToolsAndHistory(...) {
    // ... (logging and setup)

    // 1. Always build a fresh, unified system prompt with the LATEST context.
    systemContent := s.promptBuilder.buildSystemPromptWithContext(financialContext)

    // 2. Assemble the full message list in the correct order: System -> History -> User.
    messages := make([]Message, 0)
    messages = append(messages, Message{Role: "system", Content: systemContent})
    messages = append(messages, chatHistory...) // Append all prior turns
    messages = append(messages, Message{Role: "user", Content: userMessage})

    // 3. Enter the tool-use loop with this perfectly constructed message list.
    for round := 0; round < maxRounds; round++ {
        request := &CompletionRequest{
            Messages: messages,
            // ...
        }
        // ... The rest of the loop proceeds, appending new assistant/tool messages
    }
}
```

**File to Modify:** `backend/internal/services/excel_bridge.go`

**The Task:** With the AI service now handling all logic, we will drastically simplify `ProcessChatMessage`. It will no longer contain any special branching. Its role is reduced to gathering the necessary pieces—context and history—and handing them off to the AI service.

**New Simplified `ProcessChatMessage` Logic:**
```go
// In excel_bridge.go...
func (eb *ExcelBridge) ProcessChatMessage(...) {
    // 1. Get the session.
    session := eb.getOrCreateSession(...)

    // 2. Build the latest financial context.
    financialContext := eb.buildFinancialContext(...)

    // 3. Get the conversation history *before* the current message.
    priorHistory := eb.chatHistory.GetHistory(session.ID)

    // 4. Call the single, authoritative AI service function.
    aiResponse, err := eb.aiService.ProcessChatWithToolsAndHistory(...)

    // 5. Add the new user message and the AI's response to history *after* the interaction is complete.
    eb.chatHistory.AddMessage(session.ID, "user", message.Content)
    if err == nil && aiResponse != nil {
        eb.chatHistory.AddMessage(session.ID, "assistant", aiResponse.Content)
    }

    // ... (build and return the final response to the client)
}
```

### **Phase 3: Enhancing Robustness with Token Management and Better Error Handling**

To make the system resilient, we will add two final layers of polish.

1.  **Proactive Token Management (`prompt_builder.go`):** Large spreadsheets and long conversations can exceed the AI's context window. We will introduce a utility to estimate the token count of a prompt before sending it. If it exceeds a safe threshold, it will intelligently truncate the least critical information (e.g., the oldest messages in the chat history) to prevent an API error.

2.  **Refined Error Handling (`excel_bridge.go`):** Instead of returning generic error messages, the bridge will inspect the structured `AIError` type returned by the service. This allows us to provide specific, helpful feedback to the user, such as "The AI model is currently overloaded. Please try again," which creates a much better user experience than a vague failure notice.

## **4. Conclusion: Achieving True AI Partnership**

By executing this refined plan, we will transform Gridmate's AI from a forgetful tool into a stateful partner. It will remember every detail of the conversation and stay perfectly in sync with the user's spreadsheet, enabling it to handle the complex, iterative workflows that define professional financial modeling. This is a critical step toward fulfilling the project's mission of creating a true "Cursor for financial analysts."