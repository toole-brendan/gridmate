package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gridmate/backend/internal/services"
	"github.com/sirupsen/logrus"
)

func TestMetricsHandler_GetSessionMetrics(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sessionManager := services.NewSessionManager(logger)
	handler := NewMetricsHandler(sessionManager, logger)
	
	// Add some test sessions
	sessionManager.RegisterSession(&services.SessionInfo{
		ID:           "test-1",
		Type:         services.SessionTypeSignalR,
		UserID:       "user-1",
		CreatedAt:    time.Now(),
		LastActivity: time.Now(),
	})
	
	sessionManager.RegisterSession(&services.SessionInfo{
		ID:           "test-2",
		Type:         services.SessionTypeWebSocket,
		UserID:       "user-2",
		CreatedAt:    time.Now(),
		LastActivity: time.Now(),
	})
	
	// Create request
	req, err := http.NewRequest("GET", "/api/metrics/sessions", nil)
	if err != nil {
		t.Fatal(err)
	}
	
	// Create response recorder
	rr := httptest.NewRecorder()
	
	// Call handler
	handler.GetSessionMetrics(rr, req)
	
	// Check status code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
	
	// Parse response
	var metrics map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &metrics); err != nil {
		t.Fatal("Failed to parse response:", err)
	}
	
	// Verify metrics
	if totalSessions := metrics["total_sessions"]; totalSessions != float64(2) {
		t.Errorf("Expected 2 total sessions, got %v", totalSessions)
	}
	
	// Verify by_type
	byType := metrics["by_type"].(map[string]interface{})
	if byType["signalr"] != float64(1) {
		t.Errorf("Expected 1 SignalR session, got %v", byType["signalr"])
	}
	if byType["websocket"] != float64(1) {
		t.Errorf("Expected 1 WebSocket session, got %v", byType["websocket"])
	}
}

func TestMetricsHandler_GetHealthCheck(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sessionManager := services.NewSessionManager(logger)
	handler := NewMetricsHandler(sessionManager, logger)
	
	// Create request
	req, err := http.NewRequest("GET", "/api/metrics/health", nil)
	if err != nil {
		t.Fatal(err)
	}
	
	// Create response recorder
	rr := httptest.NewRecorder()
	
	// Call handler
	handler.GetHealthCheck(rr, req)
	
	// Check status code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
	
	// Parse response
	var health map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &health); err != nil {
		t.Fatal("Failed to parse response:", err)
	}
	
	// Verify health status
	if status := health["status"]; status != "healthy" {
		t.Errorf("Expected healthy status, got %v", status)
	}
	
	// Verify session count
	if sessionCount := health["session_count"]; sessionCount != float64(0) {
		t.Errorf("Expected 0 sessions, got %v", sessionCount)
	}
}