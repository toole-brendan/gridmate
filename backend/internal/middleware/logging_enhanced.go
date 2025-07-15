package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gridmate/backend/internal/config"
	"github.com/sirupsen/logrus"
)

// OperationGroup tracks related operations
type OperationGroup struct {
	ID         string
	Type       string
	StartTime  time.Time
	Operations []Operation
	mu         sync.Mutex
}

// Operation represents a single operation in a group
type Operation struct {
	Type      string
	Status    string
	Message   string
	Timestamp time.Time
	Duration  time.Duration
	Details   map[string]interface{}
}

// EnhancedLoggingMiddleware provides improved logging with operation grouping
type EnhancedLoggingMiddleware struct {
	logger     *logrus.Logger
	config     *config.LogConfig
	groups     map[string]*OperationGroup
	groupMutex sync.RWMutex
}

// NewEnhancedLoggingMiddleware creates a new enhanced logging middleware
func NewEnhancedLoggingMiddleware(logger *logrus.Logger, cfg *config.LogConfig) *EnhancedLoggingMiddleware {
	return &EnhancedLoggingMiddleware{
		logger: logger,
		config: cfg,
		groups: make(map[string]*OperationGroup),
	}
}

// Middleware returns the HTTP middleware function
func (m *EnhancedLoggingMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip logging for configured paths
		if m.shouldSkipPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		
		// Generate or extract request ID
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		
		// Add request ID to context
		ctx := context.WithValue(r.Context(), "request_id", requestID)
		r = r.WithContext(ctx)
		
		// Capture request details
		start := time.Now()
		wrapped := &responseWriter{ResponseWriter: w, status: http.StatusOK, body: &bytes.Buffer{}}
		
		// Log request based on endpoint type
		if m.isToolEndpoint(r.URL.Path) {
			m.logToolRequest(r, requestID)
		} else {
			m.logStandardRequest(r, requestID)
		}
		
		// Process request
		next.ServeHTTP(wrapped, r)
		
		// Log response
		duration := time.Since(start)
		if m.isToolEndpoint(r.URL.Path) {
			m.logToolResponse(r, wrapped, duration, requestID)
		} else {
			m.logStandardResponse(r, wrapped, duration, requestID)
		}
		
		// Check if we should create a batch summary
		m.checkBatchSummary(r, requestID)
	})
}

// logToolRequest logs tool-specific requests with grouping
func (m *EnhancedLoggingMiddleware) logToolRequest(r *http.Request, requestID string) {
	// Parse request body to understand the tool operation
	body, _ := m.readBody(r)
	
	var toolData map[string]interface{}
	json.Unmarshal(body, &toolData)
	
	// Extract session and tool info
	sessionID := m.extractSessionID(toolData)
	toolType := m.extractToolType(r.URL.Path, toolData)
	
	// Check if this is part of a batch
	batchID := m.extractBatchID(toolData)
	if batchID != "" {
		m.addToGroup(batchID, toolType, "request", requestID, toolData)
	}
	
	// Log with appropriate detail level
	entry := m.logger.WithFields(logrus.Fields{
		"component":   "tool_handler",
		"request_id":  requestID,
		"session_id":  sessionID,
		"tool_type":   toolType,
		"batch_id":    batchID,
	})
	
	if m.config.Environment == "development" {
		entry.Debug("Tool request received")
	} else {
		entry.Info("Processing tool request")
	}
}

// logToolResponse logs tool responses with status
func (m *EnhancedLoggingMiddleware) logToolResponse(r *http.Request, w *responseWriter, duration time.Duration, requestID string) {
	// Only log significant events in production
	if m.config.Environment == "production" && w.status < 400 && duration < 100*time.Millisecond {
		return
	}
	
	entry := m.logger.WithFields(logrus.Fields{
		"component":   "tool_handler",
		"request_id":  requestID,
		"status":      w.status,
		"duration_ms": duration.Milliseconds(),
	})
	
	// Add response preview for development
	if m.config.Environment == "development" && w.body.Len() > 0 {
		var response map[string]interface{}
		if err := json.Unmarshal(w.body.Bytes(), &response); err == nil {
			if preview := m.createResponsePreview(response); preview != "" {
				entry = entry.WithField("preview", preview)
			}
		}
	}
	
	if w.status >= 400 {
		entry.Error("Tool request failed")
	} else if duration > 1*time.Second {
		entry.Warn("Slow tool request")
	} else {
		entry.Info("Tool request completed")
	}
}

// logStandardRequest logs non-tool requests
func (m *EnhancedLoggingMiddleware) logStandardRequest(r *http.Request, requestID string) {
	// Minimal logging for standard requests
	if m.config.Environment != "development" {
		return
	}
	
	m.logger.WithFields(logrus.Fields{
		"component":  "http",
		"method":     r.Method,
		"path":       r.URL.Path,
		"request_id": requestID,
	}).Debug("HTTP request")
}

// logStandardResponse logs non-tool responses
func (m *EnhancedLoggingMiddleware) logStandardResponse(r *http.Request, w *responseWriter, duration time.Duration, requestID string) {
	entry := m.logger.WithFields(logrus.Fields{
		"component":   "http",
		"method":      r.Method,
		"path":        r.URL.Path,
		"status":      w.status,
		"duration_ms": duration.Milliseconds(),
		"request_id":  requestID,
	})
	
	// Log based on status and duration
	if w.status >= 500 {
		entry.Error("Server error")
	} else if w.status >= 400 {
		entry.Warn("Client error")
	} else if duration > 1*time.Second {
		entry.Warn("Slow request")
	} else if m.config.Environment == "development" {
		entry.Info("Request completed")
	}
}

// Group management methods

func (m *EnhancedLoggingMiddleware) addToGroup(groupID, opType, status, requestID string, details map[string]interface{}) {
	m.groupMutex.Lock()
	defer m.groupMutex.Unlock()
	
	group, exists := m.groups[groupID]
	if !exists {
		group = &OperationGroup{
			ID:        groupID,
			Type:      "batch_operation",
			StartTime: time.Now(),
		}
		m.groups[groupID] = group
		
		// Log group start
		m.logger.WithFields(logrus.Fields{
			"operation_group": groupID,
			"operation_type":  "batch",
			"group_start":     true,
		}).Info("Starting batch operation")
	}
	
	// Add operation to group
	group.mu.Lock()
	group.Operations = append(group.Operations, Operation{
		Type:      opType,
		Status:    status,
		Message:   fmt.Sprintf("%s %s", opType, status),
		Timestamp: time.Now(),
		Details:   details,
	})
	group.mu.Unlock()
}

func (m *EnhancedLoggingMiddleware) checkBatchSummary(r *http.Request, requestID string) {
	// Check if this completes a batch
	m.groupMutex.RLock()
	defer m.groupMutex.RUnlock()
	
	for groupID, group := range m.groups {
		// If group is older than 5 seconds, summarize it
		if time.Since(group.StartTime) > 5*time.Second {
			m.createBatchSummary(groupID, group)
		}
	}
}

func (m *EnhancedLoggingMiddleware) createBatchSummary(groupID string, group *OperationGroup) {
	group.mu.Lock()
	defer group.mu.Unlock()
	
	// Count operations by type and status
	opCounts := make(map[string]int)
	statusCounts := make(map[string]int)
	var totalDuration time.Duration
	
	for _, op := range group.Operations {
		opCounts[op.Type]++
		statusCounts[op.Status]++
		totalDuration += op.Duration
	}
	
	// Create summary log
	m.logger.WithFields(logrus.Fields{
		"batch_summary":     true,
		"batch_id":          groupID,
		"total_operations":  len(group.Operations),
		"successful":        statusCounts["success"],
		"operations":        group.Operations,
		"duration":          time.Since(group.StartTime),
		"operation_group":   groupID,
		"group_end":         true,
	}).Info("Batch operation completed")
	
	// Clean up group
	m.groupMutex.Lock()
	delete(m.groups, groupID)
	m.groupMutex.Unlock()
}

// Helper methods

func (m *EnhancedLoggingMiddleware) shouldSkipPath(path string) bool {
	for _, skip := range m.config.SkipPaths {
		if strings.HasPrefix(path, skip) {
			return true
		}
	}
	return false
}

func (m *EnhancedLoggingMiddleware) isToolEndpoint(path string) bool {
	toolPaths := []string{
		"/api/tool-request",
		"/api/tool-response",
		"/api/excel/",
		"/api/ai/",
	}
	
	for _, toolPath := range toolPaths {
		if strings.Contains(path, toolPath) {
			return true
		}
	}
	return false
}

func (m *EnhancedLoggingMiddleware) readBody(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, nil
	}
	
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	
	// Restore body for handler
	r.Body = io.NopCloser(bytes.NewBuffer(body))
	
	// Limit body size for logging
	if len(body) > m.config.MaxBodySize {
		body = body[:m.config.MaxBodySize]
	}
	
	return body, nil
}

func (m *EnhancedLoggingMiddleware) extractSessionID(data map[string]interface{}) string {
	if session, ok := data["sessionId"].(string); ok {
		return session
	}
	if session, ok := data["session_id"].(string); ok {
		return session
	}
	return ""
}

func (m *EnhancedLoggingMiddleware) extractToolType(path string, data map[string]interface{}) string {
	// Try to extract from request data
	if toolType, ok := data["tool"].(string); ok {
		return toolType
	}
	if toolType, ok := data["tool_name"].(string); ok {
		return toolType
	}
	
	// Infer from path
	if strings.Contains(path, "read") {
		return "read_range"
	}
	if strings.Contains(path, "write") {
		return "write_range"
	}
	
	return "unknown"
}

func (m *EnhancedLoggingMiddleware) extractBatchID(data map[string]interface{}) string {
	if batchID, ok := data["batch_id"].(string); ok {
		return batchID
	}
	if input, ok := data["input"].(map[string]interface{}); ok {
		if batchID, ok := input["_batch_id"].(string); ok {
			return batchID
		}
	}
	return ""
}

func (m *EnhancedLoggingMiddleware) createResponsePreview(response map[string]interface{}) string {
	// Create a concise preview of the response
	if status, ok := response["status"].(string); ok {
		if preview, ok := response["preview"].(string); ok {
			return fmt.Sprintf("%s: %s", status, preview)
		}
		return status
	}
	
	if message, ok := response["message"].(string); ok {
		if len(message) > 50 {
			return message[:47] + "..."
		}
		return message
	}
	
	return ""
}

// Note: responseWriter is already defined in logging.go