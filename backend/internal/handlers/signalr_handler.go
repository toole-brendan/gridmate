package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gridmate/backend/internal/services"
	"github.com/sirupsen/logrus"
)

// SignalRHandler handles requests from the SignalR bridge
type SignalRHandler struct {
	excelBridge   *services.ExcelBridge
	signalRBridge *SignalRBridge
	logger        *logrus.Logger
	sessionMap    map[string]string // Maps SignalR session to client ID
	sessionMutex  sync.RWMutex
}

// NewSignalRHandler creates a new SignalR handler
func NewSignalRHandler(excelBridge *services.ExcelBridge, signalRBridge *SignalRBridge, logger *logrus.Logger) *SignalRHandler {
	return &SignalRHandler{
		excelBridge:   excelBridge,
		signalRBridge: signalRBridge,
		logger:        logger,
		sessionMap:    make(map[string]string),
	}
}

// SignalRChatRequest represents a chat request from SignalR
type SignalRChatRequest struct {
	SessionID    string                 `json:"sessionId"`
	MessageID    string                 `json:"messageId"`
	Content      string                 `json:"content"`
	ExcelContext map[string]interface{} `json:"excelContext"`
	AutonomyMode string                 `json:"autonomyMode"`
	Timestamp    time.Time              `json:"timestamp"`
}

// SignalRResponse represents a response to SignalR
type SignalRResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// HandleSignalRChat processes chat messages from SignalR
func (h *SignalRHandler) HandleSignalRChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SignalRChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.WithError(err).Error("Failed to decode SignalR chat request")
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"session_id":    req.SessionID,
		"content":       req.Content,
		"has_context":   req.ExcelContext != nil,
		"excel_context": req.ExcelContext,
		"autonomy_mode": req.AutonomyMode,
	}).Info("Received chat message from SignalR, processing synchronously.")

	// --- Start of Synchronous Processing ---

	// Create a mock Excel session for SignalR clients
	h.excelBridge.CreateSignalRSession(req.SessionID)

	// Create chat message with Excel context
	excelContext := req.ExcelContext
	if excelContext == nil {
		excelContext = make(map[string]interface{})
	}

	chatMsg := services.ChatMessage{
		Content:      req.Content,
		SessionID:    req.SessionID,
		MessageID:    req.MessageID,
		Context:      excelContext,
		AutonomyMode: req.AutonomyMode,
	}

	// Register completion callback BEFORE processing, so it's ready when operations complete
	var callbackRegistered bool
	if req.MessageID != "" {
		registry := h.excelBridge.GetQueuedOperationRegistry()
		if registry != nil {
			// Pre-register callback to ensure it's available when operations complete
			registry.RegisterMessageCompletionCallback(req.MessageID, func() {
				h.logger.WithField("message_id", req.MessageID).Info("All operations completed, sending final AI response")

				// Get operation summary
				opsSummary := registry.GetMessageOperationsSummary(req.MessageID)

				// Build completion message
				completionMessage := "I've completed all the requested operations:\n\n"

				// Get all operations for detailed summary
				ops := registry.GetMessageOperations(req.MessageID)
				successCount := 0
				failCount := 0

				for _, op := range ops {
					if op.Status == services.StatusCompleted {
						successCount++
					} else if op.Status == services.StatusFailed {
						failCount++
					}
				}

				if successCount > 0 {
					completionMessage += fmt.Sprintf("✅ Successfully completed %d operations\n", successCount)
				}
				if failCount > 0 {
					completionMessage += fmt.Sprintf("❌ Failed to complete %d operations\n", failCount)
				}

				// Add specific details about what was done
				if len(ops) > 0 {
					completionMessage += "\nHere's what I did:\n"
					for i, op := range ops {
						if op.Status == services.StatusCompleted {
							completionMessage += fmt.Sprintf("%d. %s\n", i+1, op.Preview)
						}
					}
				}

				completionMessage += "\nThe DCF model structure is now in place. You can start adding your specific data and formulas to complete the model."

				// Send final completion response
				finalResponse := map[string]interface{}{
					"messageId":         req.MessageID,
					"content":           completionMessage,
					"isComplete":        true,
					"operationsSummary": opsSummary,
					"type":              "completion", // Mark this as a completion message
				}

				if err := h.signalRBridge.SendAIResponse(req.SessionID, finalResponse); err != nil {
					h.logger.WithError(err).Error("Failed to send completion response via SignalR")
				}
			})
			callbackRegistered = true
			h.logger.WithField("message_id", req.MessageID).Info("Pre-registered completion callback before AI processing")
		}
	}

	// Process through Excel bridge
	response, err := h.excelBridge.ProcessChatMessage(req.SessionID, chatMsg)
	if err != nil {
		h.logger.WithError(err).Error("Failed to process chat message")
		// Send error back to client via SignalR
		h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
			"messageId":  req.MessageID,
			"error":      err.Error(),
			"isComplete": true, // Mark as complete on error
		})
		// Still return a success to the .NET hub, as the error was handled.
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(SignalRResponse{
			Success: true,
			Message: "Chat message processed with an error.",
		})
		return
	}

	// Check if operations were queued
	hasQueuedOps := false
	if response.Actions != nil {
		for _, action := range response.Actions {
			if action.Type == "preview_queued" {
				hasQueuedOps = true
				break
			}
		}
	}

	// If no operations were queued but we registered a callback, remove it
	if !hasQueuedOps && callbackRegistered {
		registry := h.excelBridge.GetQueuedOperationRegistry()
		if registry != nil {
			// Remove the pre-registered callback since no operations were queued
			h.logger.WithField("message_id", req.MessageID).Info("No operations queued, removing pre-registered callback")
			registry.UnregisterMessageCompletionCallback(req.MessageID)
		}
	}

	// Send response back to client via SignalR
	err = h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
		"messageId":  req.MessageID, // Include the message ID from the request
		"content":    response.Content,
		"actions":    response.Actions,
		"isComplete": response.IsFinal && !hasQueuedOps, // Only mark as complete if no operations are queued
	})
	if err != nil {
		h.logger.WithError(err).Error("Failed to send response via SignalR")
	}

	// --- End of Synchronous Processing ---

	// Return success to the .NET Hub, indicating the entire process is complete.
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SignalRResponse{
		Success: true,
		Message: "Chat message processed and response sent.",
	})
}

// SignalRToolResponse represents a tool response from SignalR
type SignalRToolResponse struct {
	SessionID    string                 `json:"sessionId"`
	RequestID    string                 `json:"requestId"`
	Result       interface{}            `json:"result"`
	Error        string                 `json:"error"`
	ErrorDetails string                 `json:"errorDetails"` // Stack trace or detailed error info
	Metadata     map[string]interface{} `json:"metadata"`     // Additional context
	Timestamp    time.Time              `json:"timestamp"`
	Queued       bool                   `json:"queued"`       // Indicates tool is queued for approval
	Acknowledged bool                   `json:"acknowledged"` // Indicates this is just an acknowledgment
}

// HandleSignalRToolResponse processes tool responses from SignalR
func (h *SignalRHandler) HandleSignalRToolResponse(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SignalRToolResponse
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.WithError(err).Error("Failed to decode tool response")
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"request_id":   req.RequestID,
		"has_error":    req.Error != "",
		"has_details":  req.ErrorDetails != "",
		"has_metadata": len(req.Metadata) > 0,
		"acknowledged": req.Acknowledged,
		"queued":       req.Queued,
	}).Info("Received tool response from SignalR")

	// Log detailed error information if present
	if req.Error != "" && req.ErrorDetails != "" {
		h.logger.WithFields(logrus.Fields{
			"request_id":    req.RequestID,
			"error":         req.Error,
			"error_details": req.ErrorDetails,
			"metadata":      req.Metadata,
		}).Error("Tool execution failed with details")
	}

	// Route tool response to the waiting handler through the Excel bridge implementation
	// Get the bridge implementation from the Excel bridge
	if bridgeImpl := h.excelBridge.GetBridgeImpl(); bridgeImpl != nil {
		// Handle the tool response
		var toolErr error
		if req.Error != "" {
			// Create enhanced error message with details
			if req.ErrorDetails != "" {
				toolErr = fmt.Errorf("%s\nDetails: %s", req.Error, req.ErrorDetails)
			} else {
				toolErr = fmt.Errorf("%s", req.Error)
			}
		}

		// If tool is queued, return a special result to continue processing
		if req.Queued {
			// Return a special result that indicates the tool is queued
			bridgeImpl.HandleToolResponse(req.SessionID, req.RequestID, map[string]interface{}{
				"status":  "queued",
				"message": "Tool queued for user approval",
			}, nil)
		} else {
			// Tool was executed - update the operation status in the registry
			bridgeImpl.HandleToolResponse(req.SessionID, req.RequestID, req.Result, toolErr)

			// Get the tool ID from the request ID
			toolID := req.RequestID // Default to request ID
			if mapper := h.excelBridge.GetRequestIDMapper(); mapper != nil {
				if mappedToolID, exists := mapper.GetToolID(req.RequestID); exists {
					toolID = mappedToolID
					h.logger.WithFields(logrus.Fields{
						"request_id": req.RequestID,
						"tool_id":    toolID,
					}).Info("Found tool ID mapping for request ID")
				}
			}

			// Mark operation as completed or failed in the registry
			// Only mark operations that were actually queued (have a tool ID mapping)
			if registry := h.excelBridge.GetQueuedOperationRegistry(); registry != nil {
				// Check if this operation exists in the registry first
				if _, err := registry.GetOperationStatus(toolID); err == nil {
					// Operation exists, mark it as completed or failed
					if toolErr != nil {
						// Mark as failed
						if err := registry.MarkOperationFailed(toolID, toolErr); err != nil {
							h.logger.WithError(err).WithField("tool_id", toolID).Error("Failed to mark operation as failed")
						}
					} else {
						// Check if already completed to prevent duplicates
						status, _ := registry.GetOperationStatus(toolID)
						if status == services.StatusCompleted {
							h.logger.WithField("tool_id", toolID).Warn("Operation already completed, skipping duplicate completion")
						} else {
							// Mark as completed
							if err := registry.MarkOperationComplete(toolID, req.Result); err != nil {
								h.logger.WithError(err).WithField("tool_id", toolID).Error("Failed to mark operation as completed")
							}
						}
					}
				} else {
					// Operation not in registry - this is expected for non-queued operations
					h.logger.WithFields(logrus.Fields{
						"tool_id":    toolID,
						"request_id": req.RequestID,
					}).Debug("Operation not in registry, skipping status update")
				}
			}
		}

		h.logger.WithFields(logrus.Fields{
			"request_id": req.RequestID,
			"session_id": req.SessionID,
		}).Info("Tool response routed to handler")
	} else {
		h.logger.Error("Excel bridge implementation not available")
	}

	// Return success
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SignalRResponse{
		Success: true,
		Message: "Tool response received",
	})
}

// SignalRSelectionUpdate represents a selection update from SignalR
type SignalRSelectionUpdate struct {
	SessionID string    `json:"sessionId"`
	Selection string    `json:"selection"`
	Worksheet string    `json:"worksheet"`
	Timestamp time.Time `json:"timestamp"`
}

// HandleSignalRSelectionUpdate processes selection updates from SignalR
func (h *SignalRHandler) HandleSignalRSelectionUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SignalRSelectionUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.WithError(err).Error("Failed to decode selection update")
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"session_id": req.SessionID,
		"selection":  req.Selection,
		"worksheet":  req.Worksheet,
	}).Info("Received selection update from SignalR")

	// Update the session's selection in the Excel bridge
	h.excelBridge.UpdateSignalRSessionSelection(req.SessionID, req.Selection, req.Worksheet)

	// Return success
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SignalRResponse{
		Success: true,
		Message: "Selection update received",
	})
}
