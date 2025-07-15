package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"

	"github.com/gridmate/backend/internal/models"
	"github.com/gridmate/backend/internal/services/diff"
)

// DiffHandler handles diff-related requests
type DiffHandler struct {
	diffService   diff.Service
	signalRBridge *SignalRBridge
	logger        *logrus.Logger
}

// NewDiffHandler creates a new diff handler
func NewDiffHandler(diffService diff.Service, signalRBridge *SignalRBridge, logger *logrus.Logger) *DiffHandler {
	return &DiffHandler{
		diffService:   diffService,
		signalRBridge: signalRBridge,
		logger:        logger,
	}
}

// ComputeDiff handles diff computation requests
func (h *DiffHandler) ComputeDiff(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.sendError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get user ID from context
	userIDStr, ok := r.Context().Value("user_id").(string)
	if !ok {
		h.sendError(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse request body
	var payload models.DiffPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		h.logger.WithError(err).Error("Failed to decode diff payload")
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate workbook ID
	if payload.WorkbookID == uuid.Nil {
		h.sendError(w, http.StatusBadRequest, "Invalid workbook ID")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":     userIDStr,
		"workbook_id": payload.WorkbookID,
		"before_size": len(payload.Before),
		"after_size":  len(payload.After),
	}).Info("Computing diff")

	// Compute the diff
	hunks := h.diffService.ComputeDiff(payload.Before, payload.After)

	h.logger.WithFields(logrus.Fields{
		"workbook_id": payload.WorkbookID,
		"hunks_count": len(hunks),
	}).Debug("Diff computed")

	// Construct the SignalR message
	message := models.DiffMessage{
		WorkbookID: payload.WorkbookID,
		Revision:   1, // TODO: Implement revision tracking
		Hunks:      hunks,
	}

	// Broadcast via SignalR
	broadcastPayload := map[string]interface{}{
		"type": "workbookDiff",
		"data": message,
	}

	// Send to all clients in the workbook group
	err := h.signalRBridge.ForwardToClient(payload.WorkbookID.String(), "workbookDiff", broadcastPayload)
	if err != nil {
		h.logger.WithError(err).Error("Failed to broadcast diff via SignalR")
		// Continue anyway - the diff was computed successfully
	}

	// Respond to the original request
	h.sendJSON(w, http.StatusOK, map[string]interface{}{
		"success":     true,
		"hunks_count": len(hunks),
		"message":     "Diff computed and broadcast initiated",
	})
}

func (h *DiffHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.WithError(err).Error("Failed to encode response")
	}
}

func (h *DiffHandler) sendError(w http.ResponseWriter, status int, message string) {
	h.sendJSON(w, status, map[string]string{"error": message})
}