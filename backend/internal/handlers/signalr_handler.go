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
		Context:      excelContext,
		AutonomyMode: req.AutonomyMode,
	}

	// Process through Excel bridge
	response, err := h.excelBridge.ProcessChatMessage(req.SessionID, chatMsg)
	if err != nil {
		h.logger.WithError(err).Error("Failed to process chat message")
		// Send error back to client via SignalR
		h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
			"error": err.Error(),
		})
		// Still return a success to the .NET hub, as the error was handled.
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(SignalRResponse{
			Success: true,
			Message: "Chat message processed with an error.",
		})
		return
	}

	// Send response back to client via SignalR
	err = h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
		"content": response.Content,
		"actions": response.Actions,
		"isFinal": response.IsFinal,
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

	// Handle acknowledged responses - don't process as final
	if req.Acknowledged {
		h.logger.WithFields(logrus.Fields{
			"request_id": req.RequestID,
			"session_id": req.SessionID,
		}).Info("Received acknowledgment for tool request")

		// Don't route to handler yet, wait for final response
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(SignalRResponse{
			Success: true,
			Message: "Acknowledgment received",
		})
		return
	}

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
			bridgeImpl.HandleToolResponse(req.SessionID, req.RequestID, req.Result, toolErr)
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
