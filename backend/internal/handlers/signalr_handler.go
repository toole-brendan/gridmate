package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/gridmate/backend/internal/services"
	"github.com/gridmate/backend/internal/websocket"
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
		"session_id":     req.SessionID,
		"content":        req.Content,
		"has_context":    req.ExcelContext != nil,
		"excel_context":  req.ExcelContext,
	}).Info("Received chat message from SignalR")

	// Process the chat message
	go func() {
		// For SignalR connections, we don't have a WebSocket client
		// Instead, we'll process the message directly and send responses via SignalR
		
		// Create a mock Excel session for SignalR clients
		h.excelBridge.CreateSignalRSession(req.SessionID)
		
		// Create websocket chat message with Excel context
		excelContext := req.ExcelContext
		if excelContext == nil {
			excelContext = make(map[string]interface{})
		}
		
		chatMsg := websocket.ChatMessage{
			Content:   req.Content,
			SessionID: req.SessionID,
			Context:   excelContext,
		}

		// Process through Excel bridge
		response, err := h.excelBridge.ProcessChatMessage(req.SessionID, chatMsg)
		if err != nil {
			h.logger.WithError(err).Error("Failed to process chat message")
			// Send error back to client via SignalR
			h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
				"error": err.Error(),
			})
			return
		}

		// Send response back to client via SignalR
		err = h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
			"content": response.Content,
			"actions": response.Actions,
		})
		if err != nil {
			h.logger.WithError(err).Error("Failed to send response via SignalR")
		}
	}()

	// Immediately return success to SignalR
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SignalRResponse{
		Success: true,
		Message: "Chat message received and processing",
	})
}

// SignalRToolResponse represents a tool response from SignalR
type SignalRToolResponse struct {
	SessionID string      `json:"sessionId"`
	RequestID string      `json:"requestId"`
	Result    interface{} `json:"result"`
	Error     string      `json:"error"`
	Timestamp time.Time   `json:"timestamp"`
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
		"request_id": req.RequestID,
		"has_error":  req.Error != "",
	}).Info("Received tool response from SignalR")

	// Route tool response to the waiting handler through the WebSocket hub
	// Get the hub from the Excel bridge
	hub := h.excelBridge.GetHub()
	if hub != nil {
		// Find the session ID from the request ID
		// For SignalR, we need to handle tool responses by request ID
		// The hub should have registered handlers for both session ID and request ID
		
		// Handle the tool response
		var toolErr error
		if req.Error != "" {
			toolErr = fmt.Errorf("%s", req.Error)
		}
		hub.HandleToolResponse(req.SessionID, req.RequestID, req.Result, toolErr)
		
		h.logger.WithFields(logrus.Fields{
			"request_id": req.RequestID,
			"session_id": req.SessionID,
		}).Info("Tool response routed to handler")
	} else {
		h.logger.Error("WebSocket hub not available")
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