package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// SignalRBridge handles communication between Go backend and SignalR service
type SignalRBridge struct {
	signalRURL string
	httpClient *http.Client
}

// NewSignalRBridge creates a new SignalR bridge
func NewSignalRBridge(signalRURL string) *SignalRBridge {
	return &SignalRBridge{
		signalRURL: signalRURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ForwardToClient sends a message to a specific client via SignalR
func (b *SignalRBridge) ForwardToClient(sessionID string, messageType string, data interface{}) error {
	payload := map[string]interface{}{
		"sessionId": sessionID,
		"type":      messageType,
		"data":      data,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	url := fmt.Sprintf("%s/api/forward-to-client", b.signalRURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("signalR service returned status %d", resp.StatusCode)
	}

	return nil
}

// SendToolRequest sends a tool request to the client
func (b *SignalRBridge) SendToolRequest(sessionID string, toolRequest interface{}) error {
	return b.ForwardToClient(sessionID, "toolRequest", toolRequest)
}

// SendAIResponse sends an AI response to the client
func (b *SignalRBridge) SendAIResponse(sessionID string, response interface{}) error {
	return b.ForwardToClient(sessionID, "aiResponse", response)
}