package streaming

import (
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// StreamPhase represents the current phase of a streaming session
type StreamPhase string

const (
	PhaseInitial       StreamPhase = "initial"
	PhaseToolExecution StreamPhase = "tool_execution"
	PhaseContinuation  StreamPhase = "continuation"
	PhaseFinal         StreamPhase = "final"
)

// PhaseManager manages streaming phases and transitions
type PhaseManager struct {
	currentPhase  StreamPhase
	messageBuffer []string
	toolResults   []ToolResult
	executedTools []ToolCall
	transitions   []PhaseTransition
	mu            sync.RWMutex
}

// PhaseTransition records a phase transition
type PhaseTransition struct {
	From      StreamPhase
	To        StreamPhase
	Timestamp time.Time
	Reason    string
}

// ToolCall represents a tool invocation
type ToolCall struct {
	ID    string
	Name  string
	Input map[string]interface{}
}

// ToolResult represents the result of a tool execution
type ToolResult struct {
	Type      string
	ToolUseID string
	Content   interface{}
	IsError   bool
}

// NewPhaseManager creates a new phase manager
func NewPhaseManager() *PhaseManager {
	return &PhaseManager{
		currentPhase:  "",
		messageBuffer: make([]string, 0),
		toolResults:   make([]ToolResult, 0),
		executedTools: make([]ToolCall, 0),
		transitions:   make([]PhaseTransition, 0),
	}
}

// GetCurrentPhase returns the current phase
func (pm *PhaseManager) GetCurrentPhase() StreamPhase {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.currentPhase
}

// TransitionPhase transitions from one phase to another
func (pm *PhaseManager) TransitionPhase(from, to StreamPhase) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Validate transition
	if !pm.isValidTransition(from, to) {
		return fmt.Errorf("invalid phase transition from %s to %s", from, to)
	}

	// Record transition
	transition := PhaseTransition{
		From:      from,
		To:        to,
		Timestamp: time.Now(),
		Reason:    pm.getTransitionReason(from, to),
	}
	pm.transitions = append(pm.transitions, transition)

	// Update current phase
	pm.currentPhase = to

	// Generate transition text if needed
	if to == PhaseContinuation && len(pm.toolResults) > 0 {
		pm.generateContinuationText()
	}

	log.Info().
		Str("from", string(from)).
		Str("to", string(to)).
		Str("reason", transition.Reason).
		Msg("[PhaseManager] Phase transition")

	return nil
}

// isValidTransition checks if a phase transition is valid
func (pm *PhaseManager) isValidTransition(from, to StreamPhase) bool {
	// Initial state can transition to initial phase
	if from == "" && to == PhaseInitial {
		return true
	}

	// Define valid transitions
	validTransitions := map[StreamPhase][]StreamPhase{
		PhaseInitial:       {PhaseToolExecution, PhaseFinal},
		PhaseToolExecution: {PhaseContinuation, PhaseFinal},
		PhaseContinuation:  {PhaseToolExecution, PhaseFinal},
		PhaseFinal:         {}, // Final phase cannot transition
	}

	// Check if transition is valid
	validTargets, exists := validTransitions[from]
	if !exists {
		return false
	}

	for _, target := range validTargets {
		if target == to {
			return true
		}
	}

	return false
}

// getTransitionReason provides a reason for the phase transition
func (pm *PhaseManager) getTransitionReason(from, to StreamPhase) string {
	switch {
	case from == "" && to == PhaseInitial:
		return "Starting streaming session"
	case from == PhaseInitial && to == PhaseToolExecution:
		return "Detected tool requirements in user request"
	case from == PhaseInitial && to == PhaseFinal:
		return "No tools needed, providing direct response"
	case from == PhaseToolExecution && to == PhaseContinuation:
		return "Tools executed, providing explanation"
	case from == PhaseToolExecution && to == PhaseFinal:
		return "Tools executed, no further explanation needed"
	case from == PhaseContinuation && to == PhaseToolExecution:
		return "Additional tools needed based on results"
	case from == PhaseContinuation && to == PhaseFinal:
		return "Completed all operations"
	default:
		return "Phase transition"
	}
}

// AddToolExecution records a tool execution
func (pm *PhaseManager) AddToolExecution(tool ToolCall) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.executedTools = append(pm.executedTools, tool)
}

// AddToolResult records a tool result
func (pm *PhaseManager) AddToolResult(result ToolResult) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.toolResults = append(pm.toolResults, result)
}

// GetExecutedTools returns all executed tools
func (pm *PhaseManager) GetExecutedTools() []ToolCall {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	tools := make([]ToolCall, len(pm.executedTools))
	copy(tools, pm.executedTools)
	return tools
}

// GetToolResults returns all tool results
func (pm *PhaseManager) GetToolResults() []ToolResult {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	results := make([]ToolResult, len(pm.toolResults))
	copy(results, pm.toolResults)
	return results
}

// AddMessage adds a message to the buffer
func (pm *PhaseManager) AddMessage(message string) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.messageBuffer = append(pm.messageBuffer, message)
}

// GetMessages returns all buffered messages
func (pm *PhaseManager) GetMessages() []string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	messages := make([]string, len(pm.messageBuffer))
	copy(messages, pm.messageBuffer)
	return messages
}

// generateContinuationText creates continuation text based on tool results
func (pm *PhaseManager) generateContinuationText() {
	if len(pm.toolResults) == 0 {
		return
	}

	// Analyze tool results to generate appropriate continuation
	successCount := 0
	errorCount := 0
	for _, result := range pm.toolResults {
		if result.IsError {
			errorCount++
		} else {
			successCount++
		}
	}

	var continuationText string
	if errorCount == 0 {
		continuationText = fmt.Sprintf("\n\nI've successfully completed %d operations. ", successCount)
	} else if successCount == 0 {
		continuationText = fmt.Sprintf("\n\nI encountered errors with all %d operations. ", errorCount)
	} else {
		continuationText = fmt.Sprintf("\n\nI completed %d operations successfully, but encountered %d errors. ", successCount, errorCount)
	}

	pm.messageBuffer = append(pm.messageBuffer, continuationText)
}

// GetPhaseMetrics returns metrics about the phase transitions
func (pm *PhaseManager) GetPhaseMetrics() map[string]interface{} {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	metrics := map[string]interface{}{
		"current_phase":     pm.currentPhase,
		"transition_count":  len(pm.transitions),
		"tool_count":        len(pm.executedTools),
		"result_count":      len(pm.toolResults),
		"message_count":     len(pm.messageBuffer),
		"phase_transitions": pm.transitions,
	}

	// Calculate phase durations
	if len(pm.transitions) > 1 {
		durations := make(map[string]time.Duration)
		for i := 1; i < len(pm.transitions); i++ {
			phase := pm.transitions[i-1].To
			duration := pm.transitions[i].Timestamp.Sub(pm.transitions[i-1].Timestamp)
			durations[string(phase)] = duration
		}
		metrics["phase_durations"] = durations
	}

	return metrics
}

// Reset resets the phase manager to initial state
func (pm *PhaseManager) Reset() {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.currentPhase = ""
	pm.messageBuffer = make([]string, 0)
	pm.toolResults = make([]ToolResult, 0)
	pm.executedTools = make([]ToolCall, 0)
	pm.transitions = make([]PhaseTransition, 0)
}