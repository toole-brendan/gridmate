package services

import (
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
	Preview  interface{} `json:"preview,omitempty"`   // What the operation will do
	Context  string      `json:"context,omitempty"`   // Why this operation is needed
	CanMerge bool        `json:"can_merge,omitempty"` // Can be merged with adjacent ops
	Priority int         `json:"priority,omitempty"`  // Execution priority
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
		operations:   make(map[string]*QueuedOperation),
		dependencies: make(map[string][]string),
		batchGroups:  make(map[string][]string),
		undoStack:    make([]string, 0),
		redoStack:    make([]string, 0),
	}
}

// QueueOperation adds a new operation to the queue
func (r *QueuedOperationRegistry) QueueOperation(op *QueuedOperation) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if op.ID == "" {
		op.ID = uuid.New().String()
	}

	op.Status = StatusQueued
	op.CreatedAt = time.Now()

	// Store operation
	r.operations[op.ID] = op

	// Track dependencies
	if len(op.Dependencies) > 0 {
		for _, depID := range op.Dependencies {
			r.dependencies[depID] = append(r.dependencies[depID], op.ID)
		}
	}

	// Track batch groups
	if op.BatchID != "" {
		r.batchGroups[op.BatchID] = append(r.batchGroups[op.BatchID], op.ID)
	}

	log.Info().
		Str("operation_id", op.ID).
		Str("type", op.Type).
		Str("session_id", op.SessionID).
		Int("dependencies", len(op.Dependencies)).
		Msg("Operation queued")

	return nil
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

	opIDs, exists := r.batchGroups[batchID]
	if !exists {
		return nil
	}

	var ops []*QueuedOperation
	for _, id := range opIDs {
		if op, exists := r.operations[id]; exists {
			ops = append(ops, op)
		}
	}

	return ops
}

// MarkOperationComplete marks an operation as completed
func (r *QueuedOperationRegistry) MarkOperationComplete(operationID string, result interface{}) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	op, exists := r.operations[operationID]
	if !exists {
		return fmt.Errorf("operation %s not found", operationID)
	}

	now := time.Now()
	op.Status = StatusCompleted
	op.CompletedAt = &now
	op.Result = result

	// Add to undo stack (Cursor-style undo/redo)
	r.undoStack = append(r.undoStack, operationID)

	// Clear redo stack when new operation completes
	r.redoStack = r.redoStack[:0]

	log.Info().
		Str("operation_id", operationID).
		Str("type", op.Type).
		Msg("Operation completed")

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
		Err(err).
		Msg("Operation failed")

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

	// Create inverse operation
	undoOp := &QueuedOperation{
		ID:        uuid.New().String(),
		SessionID: op.SessionID,
		Type:      "undo_" + op.Type,
		Input:     op.Input,
		Context:   fmt.Sprintf("Undo: %s", op.Context),
		Priority:  100, // High priority for undo operations
		CreatedAt: time.Now(),
	}

	r.operations[undoOp.ID] = undoOp

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
