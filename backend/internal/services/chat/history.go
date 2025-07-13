package chat

import (
	"sync"
	"time"
)

// Message represents a single chat message with role and content
type Message struct {
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// History manages chat history for multiple sessions
type History struct {
	mu       sync.RWMutex
	sessions map[string][]Message
	maxSize  int // Maximum messages per session
}

// NewHistory creates a new chat history manager
func NewHistory() *History {
	return &History{
		sessions: make(map[string][]Message),
		maxSize:  100, // Keep last 100 messages per session
	}
}

// AddMessage adds a message to a session's history
func (h *History) AddMessage(sessionID, role, content string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	message := Message{
		Role:      role,
		Content:   content,
		Timestamp: time.Now(),
	}
	
	// Initialize session history if not exists
	if _, exists := h.sessions[sessionID]; !exists {
		h.sessions[sessionID] = make([]Message, 0, h.maxSize)
	}
	
	// Add message to history
	h.sessions[sessionID] = append(h.sessions[sessionID], message)
	
	// Trim history if it exceeds max size
	if len(h.sessions[sessionID]) > h.maxSize {
		// Keep only the last maxSize messages
		h.sessions[sessionID] = h.sessions[sessionID][len(h.sessions[sessionID])-h.maxSize:]
	}
}

// GetHistory returns the chat history for a session
func (h *History) GetHistory(sessionID string) []Message {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	if history, exists := h.sessions[sessionID]; exists {
		// Return a copy to prevent external modification
		result := make([]Message, len(history))
		copy(result, history)
		return result
	}
	
	return []Message{}
}

// GetRecentHistory returns the last N messages for a session
func (h *History) GetRecentHistory(sessionID string, count int) []Message {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	if history, exists := h.sessions[sessionID]; exists {
		if count >= len(history) {
			result := make([]Message, len(history))
			copy(result, history)
			return result
		}
		
		// Return last 'count' messages
		start := len(history) - count
		result := make([]Message, count)
		copy(result, history[start:])
		return result
	}
	
	return []Message{}
}

// ClearHistory clears the history for a session
func (h *History) ClearHistory(sessionID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	delete(h.sessions, sessionID)
}

// ClearOldSessions removes sessions that haven't been active for the specified duration
func (h *History) ClearOldSessions(maxAge time.Duration) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	cutoff := time.Now().Add(-maxAge)
	
	for sessionID, history := range h.sessions {
		if len(history) > 0 {
			lastMessage := history[len(history)-1]
			if lastMessage.Timestamp.Before(cutoff) {
				delete(h.sessions, sessionID)
			}
		}
	}
}

// GetSessionCount returns the number of active sessions
func (h *History) GetSessionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	return len(h.sessions)
}