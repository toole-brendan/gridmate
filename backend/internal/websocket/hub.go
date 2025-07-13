package websocket

import (
	"context"
	"encoding/json"
	"sync"

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
	// For now, we'll use the sessionID as userID
	// In a real implementation, you'd map sessions to users properly
	return h.BroadcastToUser(sessionID, message.Type, message.Data)
}

// HandleToolResponse handles a tool response from a client
func (h *Hub) HandleToolResponse(sessionID, requestID string, response interface{}, err error) {
	h.toolMutex.RLock()
	defer h.toolMutex.RUnlock()

	if handlers, ok := h.toolHandlers[sessionID]; ok {
		if handler, ok := handlers[requestID]; ok {
			handler(response, err)
		}
	}
}