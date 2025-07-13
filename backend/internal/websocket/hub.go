package websocket

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// BroadcastMessage represents a message to be broadcast to clients
type BroadcastMessage struct {
	Type     MessageType
	Data     []byte
	ClientID string                      // Sender client ID
	Filter   func(client *Client) bool   // Optional filter function
}

// Hub maintains the set of active clients and broadcasts messages to clients
type Hub struct {
	// Registered clients
	clients map[string]*Client
	mutex   sync.RWMutex

	// Inbound messages from clients
	broadcast chan *BroadcastMessage

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Logger
	logger *logrus.Logger

	// Context for shutdown
	ctx    context.Context
	cancel context.CancelFunc

	// Excel bridge service reference
	excelBridge ExcelBridgeService

	// Tool handlers for request/response pattern
	toolHandlers map[string]map[string]ToolHandler // sessionID -> requestID -> handler
	toolMutex    sync.RWMutex
}

// ToolHandler handles tool responses
type ToolHandler func(response interface{}, err error)

// ExcelBridgeService interface for the Excel integration
type ExcelBridgeService interface {
	ProcessChatMessage(clientID string, message ChatMessage) (*ChatResponse, error)
	GetCellValue(sheet, cell string) (interface{}, error)
	GetRangeValues(sheet, rangeAddr string) ([][]interface{}, error)
	UpdateCell(update CellUpdate) error
	UpdateRange(rangeData RangeData) error
	ApplyChanges(ctx context.Context, userID, previewID string, changeIDs []string) (*ApplyChangesResponse, error)
	RejectChanges(ctx context.Context, userID, previewID, reason string) error
}

// NewHub creates a new Hub instance
func NewHub(logger *logrus.Logger) *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	
	return &Hub{
		clients:      make(map[string]*Client),
		broadcast:    make(chan *BroadcastMessage, 256),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		logger:       logger,
		ctx:          ctx,
		cancel:       cancel,
		toolHandlers: make(map[string]map[string]ToolHandler),
	}
}

// SetExcelBridge sets the Excel bridge service
func (h *Hub) SetExcelBridge(bridge ExcelBridgeService) {
	h.excelBridge = bridge
}

// GetExcelBridge returns the Excel bridge service
func (h *Hub) GetExcelBridge() ExcelBridgeService {
	return h.excelBridge
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	h.logger.Info("WebSocket hub started")
	
	for {
		select {
		case <-h.ctx.Done():
			h.logger.Info("WebSocket hub shutting down")
			h.cleanup()
			return

		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

// Stop gracefully shuts down the hub
func (h *Hub) Stop() {
	h.cancel()
}

// RegisterClient registers a new client with the hub
func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

// registerClient adds a new client to the hub
func (h *Hub) registerClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	h.clients[client.ID] = client
	h.logger.WithField("clientID", client.ID).Info("Client registered")

	// Send initial connection notification
	client.sendMessage(MessageTypeNotification, NotificationMessage{
		Level:   "info",
		Title:   "Connected",
		Message: "Connected to Gridmate WebSocket server",
	})
}

// unregisterClient removes a client from the hub
func (h *Hub) unregisterClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, ok := h.clients[client.ID]; ok {
		delete(h.clients, client.ID)
		client.Stop()
		h.logger.WithField("clientID", client.ID).Info("Client unregistered")
	}
}

// broadcastMessage sends a message to relevant clients
func (h *Hub) broadcastMessage(msg *BroadcastMessage) {
	h.mutex.RLock()
	clients := make([]*Client, 0, len(h.clients))
	for _, client := range h.clients {
		// Skip the sender unless explicitly included
		if client.ID == msg.ClientID {
			continue
		}

		// Apply filter if provided
		if msg.Filter != nil && !msg.Filter(client) {
			continue
		}

		clients = append(clients, client)
	}
	h.mutex.RUnlock()

	// Send to filtered clients
	for _, client := range clients {
		select {
		case client.send <- msg.Data:
		default:
			// Client's send channel is full, close it
			h.unregisterClient(client)
		}
	}
}

// BroadcastToAll sends a message to all connected clients
func (h *Hub) BroadcastToAll(msgType MessageType, data interface{}) error {
	msg, err := NewMessage(msgType, data)
	if err != nil {
		return err
	}

	msgBytes, err := msg.MarshalJSON()
	if err != nil {
		return err
	}

	h.broadcast <- &BroadcastMessage{
		Type: msgType,
		Data: msgBytes,
	}

	return nil
}

// BroadcastToUser sends a message to all clients of a specific user
func (h *Hub) BroadcastToUser(userID string, msgType MessageType, data interface{}) error {
	msg, err := NewMessage(msgType, data)
	if err != nil {
		return err
	}

	msgBytes, err := msg.MarshalJSON()
	if err != nil {
		return err
	}

	h.broadcast <- &BroadcastMessage{
		Type: msgType,
		Data: msgBytes,
		Filter: func(client *Client) bool {
			return client.getUserID() == userID
		},
	}

	return nil
}

// SendToClient sends a message to a specific client
func (h *Hub) SendToClient(clientID string, msgType MessageType, data interface{}) error {
	h.mutex.RLock()
	client, ok := h.clients[clientID]
	h.mutex.RUnlock()

	if !ok {
		return nil // Client not found, silently ignore
	}

	return client.sendMessage(msgType, data)
}

// GetClient returns a client by ID
func (h *Hub) GetClient(clientID string) (*Client, bool) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	
	client, ok := h.clients[clientID]
	return client, ok
}

// GetActiveClients returns the number of active clients
func (h *Hub) GetActiveClients() int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	
	return len(h.clients)
}

// GetClientsByUser returns all clients for a specific user
func (h *Hub) GetClientsByUser(userID string) []*Client {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	clients := make([]*Client, 0)
	for _, client := range h.clients {
		if client.getUserID() == userID {
			clients = append(clients, client)
		}
	}
	
	return clients
}

// cleanup closes all client connections
func (h *Hub) cleanup() {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	for _, client := range h.clients {
		client.Stop()
	}
	
	h.clients = make(map[string]*Client)
}

// MarshalJSON marshals a Message to JSON
func (m *Message) MarshalJSON() ([]byte, error) {
	type Alias Message
	return json.Marshal(&struct {
		*Alias
	}{
		Alias: (*Alias)(m),
	})
}

// RegisterToolHandler registers a handler for a tool response
func (h *Hub) RegisterToolHandler(sessionID, requestID string, handler ToolHandler) {
	h.toolMutex.Lock()
	defer h.toolMutex.Unlock()

	if h.toolHandlers[sessionID] == nil {
		h.toolHandlers[sessionID] = make(map[string]ToolHandler)
	}
	h.toolHandlers[sessionID][requestID] = handler
}

// UnregisterToolHandler removes a tool handler
func (h *Hub) UnregisterToolHandler(sessionID, requestID string) {
	h.toolMutex.Lock()
	defer h.toolMutex.Unlock()

	if handlers, ok := h.toolHandlers[sessionID]; ok {
		delete(handlers, requestID)
		if len(handlers) == 0 {
			delete(h.toolHandlers, sessionID)
		}
	}
}

// SendToSession sends a message to all clients in a session
func (h *Hub) SendToSession(sessionID string, message Message) error {
	// The sessionID is actually the client ID in our implementation
	// Send directly to that client
	logrus.WithFields(logrus.Fields{
		"session_id":     sessionID,
		"message_type":   string(message.Type),
		"active_clients": len(h.clients),
	}).Info("SendToSession called")
	
	// Log all connected clients for debugging
	h.mutex.RLock()
	clientExists := false
	for clientID := range h.clients {
		logrus.WithField("client_id", clientID).Debug("Connected client")
		if clientID == sessionID {
			clientExists = true
		}
	}
	h.mutex.RUnlock()
	
	if !clientExists {
		logrus.WithFields(logrus.Fields{
			"session_id": sessionID,
			"active_clients": h.GetActiveClients(),
		}).Error("Client not found for session")
	}
	
	result := h.SendToClient(sessionID, message.Type, message.Data)
	if result != nil {
		logrus.WithFields(logrus.Fields{
			"session_id": sessionID,
			"error": result,
		}).Error("Failed to send message to client")
	} else {
		logrus.WithFields(logrus.Fields{
			"session_id": sessionID,
			"message_type": string(message.Type),
		}).Debug("Message sent successfully")
	}
	
	return result
}

// HandleToolResponse handles a tool response from a client
func (h *Hub) HandleToolResponse(sessionID, requestID string, response interface{}, err error) {
	h.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"request_id": requestID,
		"has_error":  err != nil,
		"timestamp":  time.Now().Format("15:04:05.000"),
	}).Info("HandleToolResponse called - RESPONSE RECEIVED")

	h.toolMutex.RLock()
	defer h.toolMutex.RUnlock()

	// Log all registered session handlers for debugging
	h.logger.WithFields(logrus.Fields{
		"session_id":          sessionID,
		"total_sessions":      len(h.toolHandlers),
		"registered_sessions": h.getRegisteredSessions(),
	}).Debug("Current tool handler state")

	if handlers, ok := h.toolHandlers[sessionID]; ok {
		h.logger.WithFields(logrus.Fields{
			"session_id":           sessionID,
			"handlers_for_session": len(handlers),
			"registered_requests":  h.getRegisteredRequests(sessionID),
		}).Info("Found handlers for session")
		
		if handler, ok := handlers[requestID]; ok {
			h.logger.WithFields(logrus.Fields{
				"session_id": sessionID,
				"request_id": requestID,
			}).Info("Found handler for request - calling handler")
			
			handler(response, err)
			
			h.logger.WithFields(logrus.Fields{
				"session_id": sessionID,
				"request_id": requestID,
			}).Debug("Handler called successfully")
			return // Successfully handled
		} else {
			h.logger.WithFields(logrus.Fields{
				"session_id":          sessionID,
				"request_id":          requestID,
				"registered_requests": h.getRegisteredRequests(sessionID),
			}).Warn("No handler found for request ID in session")
		}
	} else {
		h.logger.WithFields(logrus.Fields{
			"session_id":          sessionID,
			"request_id":          requestID,
			"registered_sessions": h.getRegisteredSessions(),
		}).Warn("No handlers found for session ID - trying alternative lookup strategies")
		
		// Strategy 1: Search all sessions for this requestID
		for altSessionID, handlers := range h.toolHandlers {
			if handler, ok := handlers[requestID]; ok {
				h.logger.WithFields(logrus.Fields{
					"original_session_id":    sessionID,
					"alternative_session_id": altSessionID,
					"request_id":             requestID,
				}).Warn("Found handler using alternative session lookup - calling handler")
				
				handler(response, err)
				
				h.logger.WithFields(logrus.Fields{
					"original_session_id":    sessionID,
					"alternative_session_id": altSessionID,
					"request_id":             requestID,
				}).Info("Handler called successfully via alternative lookup")
				return // Successfully handled
			}
		}
		
		// Strategy 2: If sessionID looks like a client ID, try to find by session pattern
		// For client IDs like "client_20250713094715.214998", try to find corresponding session
		if strings.HasPrefix(sessionID, "client_") {
			h.logger.WithFields(logrus.Fields{
				"session_id": sessionID,
				"request_id": requestID,
			}).Debug("Client ID detected, searching for matching session patterns")
			
			// Look for any tool handlers registered (should be from dual registration)
			for altSessionID, handlers := range h.toolHandlers {
				if handler, ok := handlers[requestID]; ok {
					h.logger.WithFields(logrus.Fields{
						"original_session_id":    sessionID,
						"alternative_session_id": altSessionID,
						"request_id":             requestID,
					}).Warn("Found handler via session pattern matching - calling handler")
					
					handler(response, err)
					
					h.logger.WithFields(logrus.Fields{
						"original_session_id":    sessionID,
						"alternative_session_id": altSessionID,
						"request_id":             requestID,
					}).Info("Handler called successfully via session pattern matching")
					return // Successfully handled
				}
			}
		}
		
		h.logger.WithFields(logrus.Fields{
			"session_id":          sessionID,
			"request_id":          requestID,
			"registered_sessions": h.getRegisteredSessions(),
		}).Error("No handler found for request ID in any session using any strategy")
	}
}

// Helper function to get registered session IDs for logging
func (h *Hub) getRegisteredSessions() []string {
	sessions := make([]string, 0, len(h.toolHandlers))
	for sessionID := range h.toolHandlers {
		sessions = append(sessions, sessionID)
	}
	return sessions
}

// Helper function to get registered request IDs for a session
func (h *Hub) getRegisteredRequests(sessionID string) []string {
	if handlers, ok := h.toolHandlers[sessionID]; ok {
		requests := make([]string, 0, len(handlers))
		for requestID := range handlers {
			requests = append(requests, requestID)
		}
		return requests
	}
	return []string{}
}