package ai

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// PhaseManager is a simplified version for the AI package
type PhaseManager struct {
	currentPhase StreamPhase
	executedTools []ToolCall
	toolResults   map[string]interface{}
}

// NewPhaseManager creates a new phase manager
func NewPhaseManager() *PhaseManager {
	return &PhaseManager{
		currentPhase: "",
		executedTools: make([]ToolCall, 0),
		toolResults: make(map[string]interface{}),
	}
}

// TransitionPhase transitions between phases
func (pm *PhaseManager) TransitionPhase(from, to StreamPhase) error {
	pm.currentPhase = to
	return nil
}

// GetExecutedTools returns executed tools
func (pm *PhaseManager) GetExecutedTools() []ToolCall {
	return pm.executedTools
}

// StreamingCoordinator manages multi-phase streaming responses
type StreamingCoordinator struct {
	phaseManager *PhaseManager
	aiService    *Service
	bridge       interface{} // Will be set to ExcelBridge when needed
}

// NewStreamingCoordinator creates a new streaming coordinator
func NewStreamingCoordinator(aiService *Service) *StreamingCoordinator {
	return &StreamingCoordinator{
		phaseManager: NewPhaseManager(),
		aiService:    aiService,
	}
}

// SetBridge sets the Excel bridge for tool communication
func (sc *StreamingCoordinator) SetBridge(bridge interface{}) {
	sc.bridge = bridge
}

// ProcessChatMessageStreaming handles streaming with proper phases
func (sc *StreamingCoordinator) ProcessChatMessageStreaming(ctx context.Context, session *StreamingSession, outChan chan<- CompletionChunk) error {
	log.Info().
		Str("session_id", session.ID).
		Str("message_id", session.MessageID).
		Str("autonomy_mode", session.AutonomyMode).
		Msg("[StreamingCoordinator] Starting multi-phase streaming")

	// Phase 1: Initial text explanation
	if err := sc.streamInitialExplanation(session, outChan); err != nil {
		log.Error().Err(err).Msg("[StreamingCoordinator] Failed initial explanation phase")
		return err
	}

	// Phase 2: Main AI processing with potential tool execution
	tools, continuation, err := sc.processMainPhase(ctx, session, outChan)
	if err != nil {
		log.Error().Err(err).Msg("[StreamingCoordinator] Failed main phase")
		return err
	}

	// Phase 3: Continuation/Summary if tools were executed
	if len(tools) > 0 && continuation {
		if err := sc.streamContinuation(session, tools, outChan); err != nil {
			log.Error().Err(err).Msg("[StreamingCoordinator] Failed continuation phase")
			return err
		}
	}

	// Phase 4: Final cleanup
	sc.phaseManager.TransitionPhase(sc.phaseManager.currentPhase, StreamPhaseFinal)
	
	log.Info().
		Str("session_id", session.ID).
		Msg("[StreamingCoordinator] Completed multi-phase streaming")

	return nil
}

// streamInitialExplanation ensures initial text is sent before any tools
func (sc *StreamingCoordinator) streamInitialExplanation(session *StreamingSession, outChan chan<- CompletionChunk) error {
	// Transition to initial phase
	if err := sc.phaseManager.TransitionPhase("", StreamPhaseInitial); err != nil {
		return err
	}

	// Get the last user message
	var userMessage string
	for i := len(session.Messages) - 1; i >= 0; i-- {
		if session.Messages[i].Role == "user" && session.Messages[i].Content != "" {
			userMessage = session.Messages[i].Content
			break
		}
	}

	// Generate contextual acknowledgment
	acknowledgment := sc.generateContextualAcknowledgment(userMessage, session.FinancialContext)
	
	// Send acknowledgment chunk
	chunk := CompletionChunk{
		Type:    "text",
		Content: acknowledgment,
		Done:    false,
	}
	
	select {
	case outChan <- chunk:
		log.Info().
			Str("session_id", session.ID).
			Str("acknowledgment", acknowledgment).
			Msg("[StreamingCoordinator] Sent initial acknowledgment")
	case <-session.Context.Done():
		return session.Context.Err()
	}

	return nil
}

// processMainPhase handles the main AI processing with potential tool execution
func (sc *StreamingCoordinator) processMainPhase(ctx context.Context, session *StreamingSession, outChan chan<- CompletionChunk) ([]ToolCall, bool, error) {
	// Use the existing processStreamingWithContinuation method from the AI service
	// This will handle tool detection and execution
	sc.aiService.processStreamingWithContinuation(session, outChan)
	
	// Check if tools were executed
	tools := sc.phaseManager.GetExecutedTools()
	needsContinuation := len(tools) > 0 && sc.shouldContinueAfterTools(tools)
	
	return tools, needsContinuation, nil
}

// streamContinuation adds explanatory text after tool execution
func (sc *StreamingCoordinator) streamContinuation(session *StreamingSession, tools []ToolCall, outChan chan<- CompletionChunk) error {
	// Transition to continuation phase
	if err := sc.phaseManager.TransitionPhase(StreamPhaseToolExecution, "continuation"); err != nil {
		return err
	}

	// Generate continuation text based on tool results
	continuationText := sc.generateContinuationText(tools, session.ToolResults)
	
	// Stream continuation text word by word for natural flow
	words := strings.Fields(continuationText)
	for i, word := range words {
		chunk := CompletionChunk{
			Type:    "text",
			Content: word,
			Done:    false,
		}
		
		// Add space after word (except last)
		if i < len(words)-1 {
			chunk.Content += " "
		}
		
		select {
		case outChan <- chunk:
			// Small delay for natural streaming
			time.Sleep(20 * time.Millisecond)
		case <-session.Context.Done():
			return session.Context.Err()
		}
	}

	return nil
}

// generateContextualAcknowledgment creates context-aware initial text
func (sc *StreamingCoordinator) generateContextualAcknowledgment(userMessage string, context *FinancialContext) string {
	msgLower := strings.ToLower(userMessage)
	
	// Check if spreadsheet is empty
	if context != nil && len(context.CellValues) == 0 {
		if strings.Contains(msgLower, "dcf") {
			return "I'll help you create a DCF model in your empty spreadsheet. Let me set up the structure with the key components: assumptions, revenue projections, cost modeling, and valuation calculations.\n\n"
		}
		if strings.Contains(msgLower, "lbo") {
			return "I'll help you build an LBO model from scratch. Let me create the framework with sources & uses, debt schedule, and returns analysis.\n\n"
		}
		return "I see you're working with an empty spreadsheet. Let me help you build what you need.\n\n"
	}
	
	// Model-specific acknowledgments based on detected type
	if context != nil && context.ModelType != "" {
		switch context.ModelType {
		case "DCF":
			return "I can see you're working on a DCF model. Let me help you with your request.\n\n"
		case "LBO":
			return "I notice you're building an LBO model. Let me assist you with that.\n\n"
		case "COMPS":
			return "I see you're working on comparable company analysis. Let me help you.\n\n"
		}
	}
	
	// Request-specific acknowledgments
	if strings.Contains(msgLower, "formula") {
		if strings.Contains(msgLower, "fix") || strings.Contains(msgLower, "error") {
			return "I'll help you fix that formula error. Let me analyze what's wrong.\n\n"
		}
		return "I'll help you with that formula. Let me work on it.\n\n"
	}
	
	if strings.Contains(msgLower, "chart") || strings.Contains(msgLower, "graph") {
		return "I'll create that visualization for you. Let me prepare the chart based on your data.\n\n"
	}
	
	// Default contextual acknowledgment
	if context != nil && context.SelectedRange != "" {
		return fmt.Sprintf("I'll help you with the selected range %s. Let me analyze what you need.\n\n", context.SelectedRange)
	}
	
	return "I'll help you with that. Let me analyze your spreadsheet and complete your request.\n\n"
}

// shouldContinueAfterTools determines if continuation text is needed
func (sc *StreamingCoordinator) shouldContinueAfterTools(tools []ToolCall) bool {
	// Always continue after tools to explain what was done
	return true
}

// generateContinuationText creates explanatory text after tool execution
func (sc *StreamingCoordinator) generateContinuationText(tools []ToolCall, results map[string]interface{}) string {
	if len(tools) == 0 {
		return ""
	}
	
	// Single tool execution
	if len(tools) == 1 {
		tool := tools[0]
		switch tool.Name {
		case "write_range":
			return "\n\nI've updated the cells with the new values. The changes have been applied to your spreadsheet."
		case "apply_formula":
			return "\n\nI've applied the formula to the selected range. The calculations should now be active."
		case "create_chart":
			return "\n\nI've created the chart based on your data. You should see it in your spreadsheet."
		case "format_range":
			return "\n\nI've applied the formatting to the selected cells. The visual changes are now in effect."
		case "apply_layout":
			return "\n\nI've set up the layout structure. Your spreadsheet now has the organized framework."
		default:
			return fmt.Sprintf("\n\nI've completed the %s operation. The changes have been applied.", tool.Name)
		}
	}
	
	// Multiple tools execution
	var summary strings.Builder
	summary.WriteString("\n\nI've completed the following operations:\n")
	
	// Group tools by type for better summary
	toolCounts := make(map[string]int)
	for _, tool := range tools {
		toolCounts[tool.Name]++
	}
	
	for toolName, count := range toolCounts {
		switch toolName {
		case "write_range":
			summary.WriteString(fmt.Sprintf("• Updated %d cell ranges with values\n", count))
		case "apply_formula":
			summary.WriteString(fmt.Sprintf("• Applied %d formulas\n", count))
		case "format_range":
			summary.WriteString(fmt.Sprintf("• Formatted %d ranges\n", count))
		case "apply_layout":
			summary.WriteString(fmt.Sprintf("• Created %d layout structures\n", count))
		default:
			summary.WriteString(fmt.Sprintf("• Performed %d %s operations\n", count, toolName))
		}
	}
	
	summary.WriteString("\nAll changes have been applied to your spreadsheet.")
	
	return summary.String()
}