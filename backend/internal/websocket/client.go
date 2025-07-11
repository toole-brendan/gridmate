package websocket

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512KB
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: Implement proper origin checking
		return true
	},
}

// Client represents a WebSocket client connection
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	logger *logrus.Logger

	// Client specific data
	ID            string
	authenticated bool
	authMutex     sync.RWMutex
	userID        string
	sessionData   map[string]interface{}
	dataMutex     sync.RWMutex

	// Subscriptions
	subscriptions map[string]bool
	subMutex      sync.RWMutex

	// Context for cancellation
	ctx    context.Context
	cancel context.CancelFunc
}

// NewClient creates a new client
func NewClient(hub *Hub, conn *websocket.Conn, logger *logrus.Logger) *Client {
	ctx, cancel := context.WithCancel(context.Background())
	
	return &Client{
		hub:           hub,
		conn:          conn,
		send:          make(chan []byte, 256),
		logger:        logger,
		ID:            generateClientID(),
		authenticated: false,
		sessionData:   make(map[string]interface{}),
		subscriptions: make(map[string]bool),
		ctx:           ctx,
		cancel:        cancel,
	}
}

// Start begins the client's read and write pumps
func (c *Client) Start() {
	go c.writePump()
	go c.readPump()
}

// Stop gracefully shuts down the client
func (c *Client) Stop() {
	c.cancel()
	close(c.send)
	c.conn.Close()
}

// readPump pumps messages from the WebSocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		select {
		case <-c.ctx.Done():
			return
		default:
			_, message, err := c.conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					c.logger.Errorf("WebSocket error: %v", err)
				}
				break
			}

			// Parse and handle the message
			if err := c.handleMessage(message); err != nil {
				c.logger.Errorf("Error handling message: %v", err)
				c.sendError("message_processing_error", err.Error())
			}
		}
	}
}

// writePump pumps messages from the hub to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case <-c.ctx.Done():
			return
			
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current WebSocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming messages
func (c *Client) handleMessage(data []byte) error {
	msg, err := ParseMessage(data)
	if err != nil {
		return err
	}

	// Check authentication for protected message types
	if !c.isAuthenticated() && msg.Type != MessageTypeAuth {
		return c.sendError("auth_required", "Authentication required")
	}

	switch msg.Type {
	case MessageTypeAuth:
		return c.handleAuth(msg)
	case MessageTypeChatMessage:
		return c.handleChatMessage(msg)
	case MessageTypeCellUpdate:
		return c.handleCellUpdate(msg)
	case MessageTypeRangeData:
		return c.handleRangeData(msg)
	case MessageTypeSelectionChanged:
		return c.handleSelectionChanged(msg)
	case MessageTypeSubscribe:
		return c.handleSubscribe(msg)
	case MessageTypeUnsubscribe:
		return c.handleUnsubscribe(msg)
	default:
		return c.sendError("unknown_message_type", "Unknown message type: "+string(msg.Type))
	}
}

// Authentication handlers
func (c *Client) handleAuth(msg *Message) error {
	var authData AuthMessage
	if err := json.Unmarshal(msg.Data, &authData); err != nil {
		return err
	}

	// TODO: Implement actual authentication logic
	// For now, accept any non-empty token
	if authData.Token != "" {
		c.setAuthenticated(true)
		c.setUserID("user_" + authData.Token) // Mock user ID

		return c.sendMessage(MessageTypeAuthSuccess, map[string]interface{}{
			"userID":    c.getUserID(),
			"sessionID": c.ID,
		})
	}

	return c.sendMessage(MessageTypeAuthError, ErrorMessage{
		Code:    "invalid_token",
		Message: "Invalid authentication token",
	})
}

// Chat message handler
func (c *Client) handleChatMessage(msg *Message) error {
	var chatMsg ChatMessage
	if err := json.Unmarshal(msg.Data, &chatMsg); err != nil {
		return err
	}

	// Forward to the Excel bridge service
	c.hub.broadcast <- &BroadcastMessage{
		Type:     MessageTypeChatMessage,
		Data:     msg.Data,
		ClientID: c.ID,
	}

	// TODO: Process with AI and send response
	// For now, echo back a simple response
	response := ChatResponse{
		Content:   "Received: " + chatMsg.Content,
		SessionID: chatMsg.SessionID,
		Suggestions: []string{
			"Try asking about specific cells",
			"Request a formula explanation",
		},
	}

	return c.sendMessage(MessageTypeChatResponse, response)
}

// Cell update handler
func (c *Client) handleCellUpdate(msg *Message) error {
	var update CellUpdate
	if err := json.Unmarshal(msg.Data, &update); err != nil {
		return err
	}

	// Broadcast to other clients subscribed to this cell
	c.hub.broadcast <- &BroadcastMessage{
		Type:     MessageTypeCellValueUpdate,
		Data:     msg.Data,
		ClientID: c.ID,
		Filter: func(client *Client) bool {
			return client.isSubscribedTo("cell:" + update.Sheet + ":" + update.Cell)
		},
	}

	return nil
}

// Range data handler
func (c *Client) handleRangeData(msg *Message) error {
	var rangeData RangeData
	if err := json.Unmarshal(msg.Data, &rangeData); err != nil {
		return err
	}

	// Store in session data for context
	c.setSessionData("lastRange", rangeData)

	// Broadcast to other clients subscribed to this range
	c.hub.broadcast <- &BroadcastMessage{
		Type:     MessageTypeRangeDataUpdate,
		Data:     msg.Data,
		ClientID: c.ID,
		Filter: func(client *Client) bool {
			return client.isSubscribedTo("range:" + rangeData.Sheet + ":" + rangeData.Range)
		},
	}

	return nil
}

// Selection changed handler
func (c *Client) handleSelectionChanged(msg *Message) error {
	var selection SelectionChanged
	if err := json.Unmarshal(msg.Data, &selection); err != nil {
		return err
	}

	// Store in session data
	c.setSessionData("currentSelection", selection)

	return nil
}

// Subscription handlers
func (c *Client) handleSubscribe(msg *Message) error {
	var req SubscriptionRequest
	if err := json.Unmarshal(msg.Data, &req); err != nil {
		return err
	}

	c.subMutex.Lock()
	defer c.subMutex.Unlock()

	// Add subscriptions
	for _, sheet := range req.Sheets {
		c.subscriptions["sheet:"+sheet] = true
	}
	for _, cell := range req.Cells {
		c.subscriptions["cell:"+cell] = true
	}
	for _, r := range req.Ranges {
		c.subscriptions["range:"+r] = true
	}

	return nil
}

func (c *Client) handleUnsubscribe(msg *Message) error {
	var req SubscriptionRequest
	if err := json.Unmarshal(msg.Data, &req); err != nil {
		return err
	}

	c.subMutex.Lock()
	defer c.subMutex.Unlock()

	// Remove subscriptions
	for _, sheet := range req.Sheets {
		delete(c.subscriptions, "sheet:"+sheet)
	}
	for _, cell := range req.Cells {
		delete(c.subscriptions, "cell:"+cell)
	}
	for _, r := range req.Ranges {
		delete(c.subscriptions, "range:"+r)
	}

	return nil
}

// Helper methods
func (c *Client) sendMessage(msgType MessageType, data interface{}) error {
	msg, err := NewMessage(msgType, data)
	if err != nil {
		return err
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	select {
	case c.send <- msgBytes:
		return nil
	case <-time.After(writeWait):
		return websocket.ErrCloseSent
	}
}

func (c *Client) sendError(code, message string) error {
	return c.sendMessage(MessageTypeError, ErrorMessage{
		Code:    code,
		Message: message,
	})
}

func (c *Client) isAuthenticated() bool {
	c.authMutex.RLock()
	defer c.authMutex.RUnlock()
	return c.authenticated
}

func (c *Client) setAuthenticated(auth bool) {
	c.authMutex.Lock()
	defer c.authMutex.Unlock()
	c.authenticated = auth
}

func (c *Client) getUserID() string {
	c.authMutex.RLock()
	defer c.authMutex.RUnlock()
	return c.userID
}

func (c *Client) setUserID(id string) {
	c.authMutex.Lock()
	defer c.authMutex.Unlock()
	c.userID = id
}

func (c *Client) setSessionData(key string, value interface{}) {
	c.dataMutex.Lock()
	defer c.dataMutex.Unlock()
	c.sessionData[key] = value
}

func (c *Client) getSessionData(key string) (interface{}, bool) {
	c.dataMutex.RLock()
	defer c.dataMutex.RUnlock()
	val, ok := c.sessionData[key]
	return val, ok
}

func (c *Client) isSubscribedTo(key string) bool {
	c.subMutex.RLock()
	defer c.subMutex.RUnlock()
	return c.subscriptions[key]
}

// generateClientID generates a unique client ID
func generateClientID() string {
	// In production, use UUID
	return "client_" + time.Now().Format("20060102150405.999999999")
}