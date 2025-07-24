package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// QueuedOperationRegistry manages queued operations similar to how Cursor manages pending edits
type QueuedOperationRegistry struct {
	operations map[string]*QueuedOperation
	mu         sync.RWMutex

	// Cursor-style features
	dependencies map[string][]string // operation ID -> dependent operation IDs
	batchGroups  map[string][]string // batch ID -> operation IDs
	undoStack    []string            // operation IDs in order of execution
	redoStack    []string            // operation IDs that were undone

	// Message tracking
	messageOperations  map[string][]string // message ID -> operation IDs
	operationCallbacks map[string]func()   // message ID -> callback when all ops complete
}

// QueuedOperation represents a pending operation
type QueuedOperation struct {
	ID           string                 `json:"id"`
	SessionID    string                 `json:"session_id"`
	Type         string                 `json:"type"`
	Status       OperationStatus        `json:"status"`
	Input        map[string]interface{} `json:"input"`
	Result       interface{}            `json:"result,omitempty"`
	Error        string                 `json:"error,omitempty"`
	Dependencies []string               `json:"dependencies"`
	BatchID      string                 `json:"batch_id,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	CompletedAt  *time.Time             `json:"completed_at,omitempty"`

	// Cursor-style metadata
	Preview     interface{} `json:"preview,omitempty"`      // What the operation will do
	PreviewType string      `json:"preview_type,omitempty"` // Type of preview (excel_diff, image, json)
	Context     string      `json:"context,omitempty"`      // Why this operation is needed
	CanMerge    bool        `json:"can_merge,omitempty"`    // Can be merged with adjacent ops
	Priority    int         `json:"priority,omitempty"`     // Execution priority

	// Message tracking
	MessageID string `json:"message_id,omitempty"` // ID of the chat message that triggered this operation
}

type OperationStatus string

const (
	StatusQueued     OperationStatus = "queued"
	StatusInProgress OperationStatus = "in_progress"
	StatusCompleted  OperationStatus = "completed"
	StatusFailed     OperationStatus = "failed"
	StatusCancelled  OperationStatus = "cancelled"
)

// NewQueuedOperationRegistry creates a new registry
func NewQueuedOperationRegistry() *QueuedOperationRegistry {
	return &QueuedOperationRegistry{
		operations:         make(map[string]*QueuedOperation),
		dependencies:       make(map[string][]string),
		batchGroups:        make(map[string][]string),
		undoStack:          make([]string, 0),
		redoStack:          make([]string, 0),
		messageOperations:  make(map[string][]string),
		operationCallbacks: make(map[string]func()),
	}
}

// QueueOperation adds a new operation to the queue
func (r *QueuedOperationRegistry) QueueOperation(op interface{}) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	var operation *QueuedOperation

	// Handle different input types
	switch v := op.(type) {
	case *QueuedOperation:
		operation = v
	case map[string]interface{}:
		// Convert map to QueuedOperation
		operation = &QueuedOperation{
			ID:        getStringFromMap(v, "ID"),
			SessionID: getStringFromMap(v, "SessionID"),
			Type:      getStringFromMap(v, "Type"),
			Input:     getMapFromInterface(v["Input"]),
			Preview:   v["Preview"], // Keep as interface{} for flexibility
			Context:   getStringFromMap(v, "Context"),
			Priority:  getIntFromMap(v, "Priority"),
		}

		// Handle dependencies if present
		if deps, ok := v["Dependencies"].([]string); ok {
			operation.Dependencies = deps
		}

		// Handle batch ID if present
		if batchID := getStringFromMap(v, "BatchID"); batchID != "" {
			operation.BatchID = batchID
		}

		// Handle message ID if present
		if messageID := getStringFromMap(v, "MessageID"); messageID != "" {
			operation.MessageID = messageID
		}

		// Handle preview type if present
		if previewType := getStringFromMap(v, "PreviewType"); previewType != "" {
			operation.PreviewType = previewType
		}
	default:
		return fmt.Errorf("unsupported operation type: %T", op)
	}

	if operation.ID == "" {
		operation.ID = uuid.New().String()
	}

	operation.Status = StatusQueued
	operation.CreatedAt = time.Now()

	// Store operation
	r.operations[operation.ID] = operation

	// Track dependencies
	if len(operation.Dependencies) > 0 {
		for _, depID := range operation.Dependencies {
			r.dependencies[depID] = append(r.dependencies[depID], operation.ID)
		}
	}

	// Track batch groups
	if operation.BatchID != "" {
		r.batchGroups[operation.BatchID] = append(r.batchGroups[operation.BatchID], operation.ID)
	}

	// Track message operations
	if operation.MessageID != "" {
		r.messageOperations[operation.MessageID] = append(r.messageOperations[operation.MessageID], operation.ID)
	}

	log.Info().
		Str("operation_id", operation.ID).
		Str("type", operation.Type).
		Str("session_id", operation.SessionID).
		Int("dependencies", len(operation.Dependencies)).
		Interface("preview", operation.Preview).
		Str("message_id", operation.MessageID).
		Msg("Operation queued")

	return nil
}

// Helper functions for safe type conversion
func getStringFromMap(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getIntFromMap(m map[string]interface{}, key string) int {
	if v, ok := m[key].(int); ok {
		return v
	}
	// Try float64 (JSON numbers are often decoded as float64)
	if v, ok := m[key].(float64); ok {
		return int(v)
	}
	return 0
}

func getMapFromInterface(v interface{}) map[string]interface{} {
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}
	return make(map[string]interface{})
}

// GetPendingOperations returns operations that can be executed
// (no pending dependencies), similar to Cursor's edit queue
func (r *QueuedOperationRegistry) GetPendingOperations(sessionID string) []*QueuedOperation {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var pending []*QueuedOperation

	for _, op := range r.operations {
		if op.SessionID != sessionID || op.Status != StatusQueued {
			continue
		}

		// Check if all dependencies are completed
		canExecute := true
		for _, depID := range op.Dependencies {
			if dep, exists := r.operations[depID]; exists {
				if dep.Status != StatusCompleted {
					canExecute = false
					break
				}
			}
		}

		if canExecute {
			pending = append(pending, op)
		}
	}

	// Sort by priority (Cursor-style intelligent ordering)
	// Higher priority operations execute first
	for i := 0; i < len(pending)-1; i++ {
		for j := i + 1; j < len(pending); j++ {
			if pending[j].Priority > pending[i].Priority {
				pending[i], pending[j] = pending[j], pending[i]
			}
		}
	}

	return pending
}

// GetBatchOperations returns all operations in a batch
func (r *QueuedOperationRegistry) GetBatchOperations(batchID string) []*QueuedOperation {
	r.mu.RLock()
	defer r.mu.RUnlock()

	operationIDs, exists := r.batchGroups[batchID]
	if !exists {
		return nil
	}

	ops := make([]*QueuedOperation, 0, len(operationIDs))
	for _, id := range operationIDs {
		if op, exists := r.operations[id]; exists {
			ops = append(ops, op)
		}
	}

	return ops
}

// CanExecute checks if an operation can be executed based on its dependencies
func (r *QueuedOperationRegistry) CanExecute(operationID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	op, exists := r.operations[operationID]
	if !exists {
		return false
	}

	// Can't execute if already completed or failed
	if op.Status != StatusQueued {
		return false
	}

	// Check if all dependencies are completed
	for _, depID := range op.Dependencies {
		depOp, exists := r.operations[depID]
		if !exists {
			// Dependency doesn't exist, can't execute
			return false
		}
		if depOp.Status != StatusCompleted {
			// Dependency not completed, can't execute
			return false
		}
	}

	return true
}

// GetOperationSummary returns a summary of pending operations for context refresh
func (r *QueuedOperationRegistry) GetOperationSummary(ctx context.Context, sessionID string) map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Count operations by status
	statusCounts := map[string]int{
		"queued":      0,
		"in_progress": 0,
		"completed":   0,
		"failed":      0,
		"cancelled":   0,
	}

	// Collect pending operations with previews
	pendingOps := []map[string]interface{}{}

	for _, op := range r.operations {
		if op.SessionID != sessionID {
			continue
		}

		// Count by status
		statusCounts[string(op.Status)]++

		// Include only pending operations in the detailed list
		if op.Status == StatusQueued || op.Status == StatusInProgress {
			opSummary := map[string]interface{}{
				"id":           op.ID,
				"type":         op.Type,
				"status":       op.Status,
				"preview":      op.Preview,
				"dependencies": op.Dependencies,
				"can_approve":  r.CanExecute(op.ID),
			}

			// Add batch info if applicable
			if op.BatchID != "" {
				opSummary["batch_id"] = op.BatchID
				opSummary["batch_size"] = len(r.batchGroups[op.BatchID])
			}

			pendingOps = append(pendingOps, opSummary)
		}
	}

	// Build summary
	summary := map[string]interface{}{
		"counts":      statusCounts,
		"pending":     pendingOps,
		"total":       len(pendingOps),
		"has_blocked": r.hasBlockedOperations(sessionID),
	}

	// Add batch information
	batches := r.getSessionBatches(sessionID)
	if len(batches) > 0 {
		summary["batches"] = batches
	}

	log.Debug().
		Str("session_id", sessionID).
		Int("total_pending", len(pendingOps)).
		Interface("status_counts", statusCounts).
		Msg("Generated operation summary for context")

	return summary
}

// hasBlockedOperations checks if there are operations blocked by dependencies
func (r *QueuedOperationRegistry) hasBlockedOperations(sessionID string) bool {
	for _, op := range r.operations {
		if op.SessionID == sessionID && op.Status == StatusQueued && !r.CanExecute(op.ID) {
			return true
		}
	}
	return false
}

// getSessionBatches returns batch information for a session
func (r *QueuedOperationRegistry) getSessionBatches(sessionID string) []map[string]interface{} {
	batches := []map[string]interface{}{}
	processedBatches := map[string]bool{}

	for _, op := range r.operations {
		if op.SessionID == sessionID && op.BatchID != "" && !processedBatches[op.BatchID] {
			processedBatches[op.BatchID] = true

			batchOps := r.GetBatchOperations(op.BatchID)
			readyCount := 0
			for _, bOp := range batchOps {
				if r.CanExecute(bOp.ID) {
					readyCount++
				}
			}

			batches = append(batches, map[string]interface{}{
				"id":              op.BatchID,
				"size":            len(batchOps),
				"ready_count":     readyCount,
				"can_approve_all": readyCount == len(batchOps),
			})
		}
	}

	return batches
}

// MarkOperationComplete marks an operation as completed
func (r *QueuedOperationRegistry) MarkOperationComplete(operationID string, result interface{}) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	op, exists := r.operations[operationID]
	if !exists {
		return fmt.Errorf("operation %s not found", operationID)
	}

	// Count operations for this message
	totalOps := 0
	completedCount := 0
	for _, msgOp := range r.operations {
		if msgOp.MessageID == op.MessageID {
			totalOps++
			if msgOp.Status == StatusCompleted {
				completedCount++
			}
		}
	}

	now := time.Now()
	op.Status = StatusCompleted
	op.CompletedAt = &now
	op.Result = result

	// Enhanced logging with operation sequence info
	log.Info().
		Str("operation_id", operationID).
		Str("message_id", op.MessageID).
		Str("type", op.Type).
		Str("sequence", fmt.Sprintf("%d/%d", completedCount+1, totalOps)).
		Interface("preview", op.Preview).
		Msg("Marking operation complete")

	// Add to undo stack (Cursor-style undo/redo)
	r.undoStack = append(r.undoStack, operationID)

	// Clear redo stack when new operation completes
	r.redoStack = r.redoStack[:0]

	log.Info().
		Str("operation_id", operationID).
		Str("type", op.Type).
		Str("message_id", op.MessageID).
		Msg("Operation completed")

	// Check if all operations for the message are completed
	if op.MessageID != "" {
		r.checkMessageCompletion(op.MessageID)
	}

	return nil
}

// MarkOperationFailed marks an operation as failed
func (r *QueuedOperationRegistry) MarkOperationFailed(operationID string, err error) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	op, exists := r.operations[operationID]
	if !exists {
		return fmt.Errorf("operation %s not found", operationID)
	}

	now := time.Now()
	op.Status = StatusFailed
	op.CompletedAt = &now
	op.Error = err.Error()

	// Cancel dependent operations (Cursor-style cascade)
	r.cancelDependentOperations(operationID)

	log.Error().
		Str("operation_id", operationID).
		Str("type", op.Type).
		Str("message_id", op.MessageID).
		Err(err).
		Msg("Operation failed")

	// Check if all operations for the message are completed
	if op.MessageID != "" {
		r.checkMessageCompletion(op.MessageID)
	}

	return nil
}

// cancelDependentOperations cancels all operations that depend on a failed operation
func (r *QueuedOperationRegistry) cancelDependentOperations(operationID string) {
	dependents, exists := r.dependencies[operationID]
	if !exists {
		return
	}

	for _, depID := range dependents {
		if op, exists := r.operations[depID]; exists && op.Status == StatusQueued {
			op.Status = StatusCancelled
			op.Error = fmt.Sprintf("Cancelled due to failure of dependency %s", operationID)

			// Recursively cancel dependents
			r.cancelDependentOperations(depID)
		}
	}
}

// CreateBatch creates a batch of related operations
func (r *QueuedOperationRegistry) CreateBatch(operations []*QueuedOperation) (string, error) {
	if len(operations) == 0 {
		return "", fmt.Errorf("no operations provided")
	}

	batchID := uuid.New().String()

	// Set batch ID and queue operations
	for _, op := range operations {
		op.BatchID = batchID
		if err := r.QueueOperation(op); err != nil {
			return "", err
		}
	}

	log.Info().
		Str("batch_id", batchID).
		Int("operations", len(operations)).
		Msg("Batch created")

	return batchID, nil
}

// GetOperationStatus returns the status of a specific operation
func (r *QueuedOperationRegistry) GetOperationStatus(operationID string) (OperationStatus, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	op, exists := r.operations[operationID]
	if !exists {
		return "", fmt.Errorf("operation %s not found", operationID)
	}

	return op.Status, nil
}

// generateInverseOperation creates an inverse operation that undoes the given operation
func (r *QueuedOperationRegistry) generateInverseOperation(op *QueuedOperation) (*QueuedOperation, error) {
	inverseOp := &QueuedOperation{
		ID:        uuid.New().String(),
		SessionID: op.SessionID,
		Priority:  100, // High priority for undo operations
		CreatedAt: time.Now(),
		Status:    StatusQueued,
	}

	// Generate inverse based on operation type
	switch op.Type {
	case "write_range":
		// For write_range, we need to restore the previous values
		// Store the previous state in the inverse operation
		inverseOp.Type = "write_range"

		// Copy the input but add a flag to indicate this is an undo
		inverseInput := make(map[string]interface{})
		for k, v := range op.Input {
			inverseInput[k] = v
		}

		// Add metadata to indicate this is an undo operation
		inverseInput["_is_undo"] = true
		inverseInput["_original_op_id"] = op.ID

		// The actual previous values should be stored when the operation completes
		if op.Result != nil {
			if resultMap, ok := op.Result.(map[string]interface{}); ok {
				if prevValues, exists := resultMap["previous_values"]; exists {
					inverseInput["values"] = prevValues
				}
			}
		}

		inverseOp.Input = inverseInput
		inverseOp.Context = fmt.Sprintf("Undo write to %v", op.Input["range"])
		inverseOp.Preview = fmt.Sprintf("Restore previous values to %v", op.Input["range"])

	case "apply_formula":
		// For formulas, restore the previous formula or clear it
		inverseOp.Type = "apply_formula"

		inverseInput := make(map[string]interface{})
		inverseInput["range"] = op.Input["range"]
		inverseInput["_is_undo"] = true
		inverseInput["_original_op_id"] = op.ID

		// Check if there was a previous formula
		if op.Result != nil {
			if resultMap, ok := op.Result.(map[string]interface{}); ok {
				if prevFormula, exists := resultMap["previous_formula"]; exists {
					inverseInput["formula"] = prevFormula
				} else {
					// If no previous formula, clear the cell
					inverseInput["formula"] = ""
				}
			}
		}

		inverseOp.Input = inverseInput
		inverseOp.Context = fmt.Sprintf("Undo formula in %v", op.Input["range"])
		inverseOp.Preview = fmt.Sprintf("Restore previous formula to %v", op.Input["range"])

	case "format_range":
		// For formatting, restore previous format
		inverseOp.Type = "format_range"

		inverseInput := make(map[string]interface{})
		inverseInput["range"] = op.Input["range"]
		inverseInput["_is_undo"] = true
		inverseInput["_original_op_id"] = op.ID

		// Restore previous format from result
		if op.Result != nil {
			if resultMap, ok := op.Result.(map[string]interface{}); ok {
				if prevFormat, exists := resultMap["previous_format"]; exists {
					inverseInput["format"] = prevFormat
				}
			}
		}

		inverseOp.Input = inverseInput
		inverseOp.Context = fmt.Sprintf("Undo formatting in %v", op.Input["range"])
		inverseOp.Preview = fmt.Sprintf("Restore previous format to %v", op.Input["range"])

	case "insert_rows_columns":
		// For insert, the inverse is delete
		inverseOp.Type = "delete_rows_columns"

		inverseInput := make(map[string]interface{})
		inverseInput["position"] = op.Input["position"]
		inverseInput["count"] = op.Input["count"]
		inverseInput["type"] = op.Input["type"] // rows or columns
		inverseInput["_is_undo"] = true
		inverseInput["_original_op_id"] = op.ID

		inverseOp.Input = inverseInput
		inverseOp.Context = fmt.Sprintf("Undo insert %v %v", op.Input["count"], op.Input["type"])
		inverseOp.Preview = fmt.Sprintf("Delete %v %v at %v", op.Input["count"], op.Input["type"], op.Input["position"])

	case "create_named_range":
		// For create named range, the inverse is delete
		inverseOp.Type = "delete_named_range"

		inverseInput := make(map[string]interface{})
		inverseInput["name"] = op.Input["name"]
		inverseInput["_is_undo"] = true
		inverseInput["_original_op_id"] = op.ID

		inverseOp.Input = inverseInput
		inverseOp.Context = fmt.Sprintf("Undo create named range '%v'", op.Input["name"])
		inverseOp.Preview = fmt.Sprintf("Delete named range '%v'", op.Input["name"])

	default:
		// For unknown operations, create a generic undo
		inverseOp.Type = "undo_" + op.Type
		inverseOp.Input = op.Input
		inverseOp.Context = fmt.Sprintf("Undo: %s", op.Context)
		inverseOp.Preview = fmt.Sprintf("Undo %s operation", op.Type)
	}

	return inverseOp, nil
}

// UndoLastOperation undoes the last completed operation (Cursor-style undo)
func (r *QueuedOperationRegistry) UndoLastOperation() (*QueuedOperation, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.undoStack) == 0 {
		return nil, fmt.Errorf("no operations to undo")
	}

	// Pop from undo stack
	lastOpID := r.undoStack[len(r.undoStack)-1]
	r.undoStack = r.undoStack[:len(r.undoStack)-1]

	// Push to redo stack
	r.redoStack = append(r.redoStack, lastOpID)

	op, exists := r.operations[lastOpID]
	if !exists {
		return nil, fmt.Errorf("operation %s not found", lastOpID)
	}

	// Generate proper inverse operation
	undoOp, err := r.generateInverseOperation(op)
	if err != nil {
		return nil, fmt.Errorf("failed to generate inverse operation: %w", err)
	}

	// Store the undo operation
	r.operations[undoOp.ID] = undoOp

	log.Info().
		Str("original_op_id", lastOpID).
		Str("undo_op_id", undoOp.ID).
		Str("operation_type", op.Type).
		Str("undo_type", undoOp.Type).
		Msg("Generated inverse operation for undo")

	return undoOp, nil
}

// RedoLastOperation redoes the last undone operation (Cursor-style redo)
func (r *QueuedOperationRegistry) RedoLastOperation() (*QueuedOperation, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.redoStack) == 0 {
		return nil, fmt.Errorf("no operations to redo")
	}

	// Pop from redo stack
	redoOpID := r.redoStack[len(r.redoStack)-1]
	r.redoStack = r.redoStack[:len(r.redoStack)-1]

	// Push back to undo stack
	r.undoStack = append(r.undoStack, redoOpID)

	op, exists := r.operations[redoOpID]
	if !exists {
		return nil, fmt.Errorf("operation %s not found", redoOpID)
	}

	// Create redo operation
	redoOp := &QueuedOperation{
		ID:        uuid.New().String(),
		SessionID: op.SessionID,
		Type:      "redo_" + op.Type,
		Input:     op.Input,
		Context:   fmt.Sprintf("Redo: %s", op.Context),
		Priority:  100, // High priority for redo operations
		CreatedAt: time.Now(),
	}

	r.operations[redoOp.ID] = redoOp

	return redoOp, nil
}

// CleanupOldOperations removes completed operations older than the specified duration
func (r *QueuedOperationRegistry) CleanupOldOperations(maxAge time.Duration) int {
	r.mu.Lock()
	defer r.mu.Unlock()

	cutoff := time.Now().Add(-maxAge)
	removed := 0

	for id, op := range r.operations {
		if op.CompletedAt != nil && op.CompletedAt.Before(cutoff) {
			delete(r.operations, id)
			delete(r.dependencies, id)

			// Clean up message operations
			if op.MessageID != "" {
				if ops, exists := r.messageOperations[op.MessageID]; exists {
					newOps := []string{}
					for _, opID := range ops {
						if opID != id {
							newOps = append(newOps, opID)
						}
					}
					if len(newOps) == 0 {
						delete(r.messageOperations, op.MessageID)
						delete(r.operationCallbacks, op.MessageID)
					} else {
						r.messageOperations[op.MessageID] = newOps
					}
				}
			}

			removed++
		}
	}

	if removed > 0 {
		log.Info().
			Int("removed", removed).
			Dur("max_age", maxAge).
			Msg("Cleaned up old operations")
	}

	return removed
}

// RegisterMessageCompletionCallback registers a callback to be called when all operations for a message are completed
func (r *QueuedOperationRegistry) RegisterMessageCompletionCallback(messageID string, callback func()) {
	r.mu.Lock()
	defer r.mu.Unlock()

	log.Info().
		Str("message_id", messageID).
		Int("existing_operations", len(r.messageOperations[messageID])).
		Msg("Registering message completion callback")

	r.operationCallbacks[messageID] = callback

	// Check if already completed
	r.checkMessageCompletion(messageID)
}

// checkMessageCompletion checks if all operations for a message are completed
// Must be called with lock held
func (r *QueuedOperationRegistry) checkMessageCompletion(messageID string) {
	operationIDs, exists := r.messageOperations[messageID]
	if !exists {
		log.Debug().
			Str("message_id", messageID).
			Msg("No operations found for message")
		return
	}

	allCompleted := true
	hasOperations := false
	statusCounts := map[OperationStatus]int{}

	for _, opID := range operationIDs {
		if op, exists := r.operations[opID]; exists {
			hasOperations = true
			statusCounts[op.Status]++
			if op.Status != StatusCompleted && op.Status != StatusFailed && op.Status != StatusCancelled {
				allCompleted = false
			}
		}
	}

	log.Debug().
		Str("message_id", messageID).
		Int("total_operations", len(operationIDs)).
		Bool("all_completed", allCompleted).
		Bool("has_operations", hasOperations).
		Interface("status_counts", statusCounts).
		Bool("has_callback", r.operationCallbacks[messageID] != nil).
		Msg("Checking message completion")

	if hasOperations && allCompleted {
		log.Info().
			Str("message_id", messageID).
			Int("operation_count", len(operationIDs)).
			Msg("All operations for message completed")

		// Call callback if registered
		if callback, exists := r.operationCallbacks[messageID]; exists {
			log.Info().
				Str("message_id", messageID).
				Msg("Executing completion callback")
			// Call callback asynchronously to avoid deadlock
			go callback()
			delete(r.operationCallbacks, messageID)
		} else {
			log.Warn().
				Str("message_id", messageID).
				Msg("No completion callback registered for completed message")
		}
	}
}

// GetMessageOperations returns all operations for a message
func (r *QueuedOperationRegistry) GetMessageOperations(messageID string) []*QueuedOperation {
	r.mu.RLock()
	defer r.mu.RUnlock()

	operationIDs, exists := r.messageOperations[messageID]
	if !exists {
		return nil
	}

	ops := make([]*QueuedOperation, 0, len(operationIDs))
	for _, id := range operationIDs {
		if op, exists := r.operations[id]; exists {
			ops = append(ops, op)
		}
	}

	return ops
}

// GetMessageOperationsSummary returns a summary of operations for a message
func (r *QueuedOperationRegistry) GetMessageOperationsSummary(messageID string) map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	operationIDs, exists := r.messageOperations[messageID]
	if !exists {
		return map[string]interface{}{
			"total":         0,
			"completed":     0,
			"failed":        0,
			"queued":        0,
			"all_completed": true,
		}
	}

	summary := map[string]interface{}{
		"total":         len(operationIDs),
		"completed":     0,
		"failed":        0,
		"queued":        0,
		"in_progress":   0,
		"cancelled":     0,
		"all_completed": true,
	}

	for _, opID := range operationIDs {
		if op, exists := r.operations[opID]; exists {
			switch op.Status {
			case StatusCompleted:
				summary["completed"] = summary["completed"].(int) + 1
			case StatusFailed:
				summary["failed"] = summary["failed"].(int) + 1
			case StatusQueued:
				summary["queued"] = summary["queued"].(int) + 1
				summary["all_completed"] = false
			case StatusInProgress:
				summary["in_progress"] = summary["in_progress"].(int) + 1
				summary["all_completed"] = false
			case StatusCancelled:
				summary["cancelled"] = summary["cancelled"].(int) + 1
			}
		}
	}

	return summary
}

// UnregisterMessageCompletionCallback removes a completion callback for a message
func (r *QueuedOperationRegistry) UnregisterMessageCompletionCallback(messageID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.operationCallbacks[messageID]; exists {
		delete(r.operationCallbacks, messageID)
		log.Info().
			Str("message_id", messageID).
			Msg("Unregistered completion callback")
	}
}
