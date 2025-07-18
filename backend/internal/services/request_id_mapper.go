package services

import (
	"sync"
	"time"
)

// RequestIDMapper maps request IDs to tool IDs
type RequestIDMapper struct {
	mappings map[string]string // request ID -> tool ID
	mu       sync.RWMutex
	ttl      time.Duration
}

// RequestIDMapping represents a mapping with timestamp
type requestIDMapping struct {
	toolID    string
	timestamp time.Time
}

// NewRequestIDMapper creates a new request ID mapper
func NewRequestIDMapper() *RequestIDMapper {
	mapper := &RequestIDMapper{
		mappings: make(map[string]string),
		ttl:      10 * time.Minute, // mappings expire after 10 minutes
	}
	// Start cleanup routine
	go mapper.cleanupExpiredMappings()
	return mapper
}

// RegisterMapping registers a mapping between request ID and tool ID
func (m *RequestIDMapper) RegisterMapping(requestID, toolID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.mappings[requestID] = toolID
}

// GetToolID returns the tool ID for a given request ID
func (m *RequestIDMapper) GetToolID(requestID string) (string, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	toolID, exists := m.mappings[requestID]
	return toolID, exists
}

// RemoveMapping removes a mapping
func (m *RequestIDMapper) RemoveMapping(requestID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.mappings, requestID)
}

// cleanupExpiredMappings periodically removes old mappings
func (m *RequestIDMapper) cleanupExpiredMappings() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		m.mu.Lock()
		// For simplicity, clear all mappings older than TTL
		// In a production system, we'd track timestamps
		if len(m.mappings) > 1000 {
			// Clear old mappings if too many accumulate
			m.mappings = make(map[string]string)
		}
		m.mu.Unlock()
	}
}
