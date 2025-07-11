package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gridmate/backend/internal/websocket"
	gorillaws "github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub    *websocket.Hub
	logger *logrus.Logger
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *websocket.Hub, logger *logrus.Logger) *WebSocketHandler {
	return &WebSocketHandler{
		hub:    hub,
		logger: logger,
	}
}

// HandleWebSocket handles WebSocket upgrade requests
func (h *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Log the connection attempt
	h.logger.WithFields(logrus.Fields{
		"method":     r.Method,
		"path":       r.URL.Path,
		"remoteAddr": r.RemoteAddr,
		"userAgent":  r.Header.Get("User-Agent"),
	}).Info("WebSocket connection attempt")

	// Create upgrader with proper settings
	upgrader := gorillaws.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			// TODO: Implement proper origin checking
			return true
		},
	}

	// Upgrade the HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.WithError(err).Error("Failed to upgrade WebSocket connection")
		http.Error(w, "Failed to upgrade connection", http.StatusBadRequest)
		return
	}

	// Create a new client
	client := websocket.NewClient(h.hub, conn, h.logger)

	// Register the client with the hub
	h.hub.RegisterClient(client)

	// Start the client's goroutines
	client.Start()

	h.logger.WithField("clientID", client.ID).Info("WebSocket client connected")
}

// GetStatus returns the current WebSocket hub status
func (h *WebSocketHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	status := map[string]interface{}{
		"activeClients": h.hub.GetActiveClients(),
		"status":        "running",
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(status); err != nil {
		h.logger.WithError(err).Error("Failed to encode WebSocket status")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}