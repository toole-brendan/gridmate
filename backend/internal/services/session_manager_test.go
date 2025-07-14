package services

import (
	"testing"
	"time"

	"github.com/sirupsen/logrus"
)

func TestSessionManager_RegisterSession(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel) // Reduce noise in tests
	
	sm := NewSessionManager(logger)
	
	session := &SessionInfo{
		ID:           "test-session-1",
		Type:         SessionTypeSignalR,
		UserID:       "user-1",
		CreatedAt:    time.Now(),
		LastActivity: time.Now(),
		Metadata:     map[string]interface{}{"key": "value"},
	}
	
	sm.RegisterSession(session)
	
	// Verify session was registered
	retrievedSession, exists := sm.GetSession("test-session-1")
	if !exists {
		t.Error("Session should exist after registration")
	}
	
	if retrievedSession.ID != session.ID {
		t.Errorf("Session ID mismatch: got %s, want %s", retrievedSession.ID, session.ID)
	}
	
	if retrievedSession.Type != session.Type {
		t.Errorf("Session type mismatch: got %s, want %s", retrievedSession.Type, session.Type)
	}
}

func TestSessionManager_UnregisterSession(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sm := NewSessionManager(logger)
	
	session := &SessionInfo{
		ID:           "test-session-1",
		Type:         SessionTypeSignalR,
		UserID:       "user-1",
		CreatedAt:    time.Now(),
		LastActivity: time.Now(),
	}
	
	sm.RegisterSession(session)
	
	// Verify session exists
	_, exists := sm.GetSession("test-session-1")
	if !exists {
		t.Error("Session should exist after registration")
	}
	
	// Unregister session
	sm.UnregisterSession("test-session-1")
	
	// Verify session no longer exists
	_, exists = sm.GetSession("test-session-1")
	if exists {
		t.Error("Session should not exist after unregistration")
	}
}

func TestSessionManager_UpdateActivity(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sm := NewSessionManager(logger)
	
	originalTime := time.Now().Add(-10 * time.Minute)
	session := &SessionInfo{
		ID:           "test-session-1",
		Type:         SessionTypeSignalR,
		UserID:       "user-1",
		CreatedAt:    originalTime,
		LastActivity: originalTime,
	}
	
	sm.RegisterSession(session)
	
	// Update activity
	time.Sleep(1 * time.Millisecond) // Ensure different timestamp
	sm.UpdateActivity("test-session-1")
	
	// Verify activity was updated
	retrievedSession, _ := sm.GetSession("test-session-1")
	if !retrievedSession.LastActivity.After(originalTime) {
		t.Error("LastActivity should be updated to a more recent time")
	}
}

func TestSessionManager_GetSessionsByType(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sm := NewSessionManager(logger)
	
	// Register sessions of different types
	sessions := []*SessionInfo{
		{
			ID:           "signalr-1",
			Type:         SessionTypeSignalR,
			UserID:       "user-1",
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
		},
		{
			ID:           "signalr-2",
			Type:         SessionTypeSignalR,
			UserID:       "user-2",
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
		},
		{
			ID:           "websocket-1",
			Type:         SessionTypeWebSocket,
			UserID:       "user-1",
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
		},
	}
	
	for _, session := range sessions {
		sm.RegisterSession(session)
	}
	
	// Get SignalR sessions
	signalRSessions := sm.GetSessionsByType(SessionTypeSignalR)
	if len(signalRSessions) != 2 {
		t.Errorf("Expected 2 SignalR sessions, got %d", len(signalRSessions))
	}
	
	// Get WebSocket sessions
	webSocketSessions := sm.GetSessionsByType(SessionTypeWebSocket)
	if len(webSocketSessions) != 1 {
		t.Errorf("Expected 1 WebSocket session, got %d", len(webSocketSessions))
	}
	
	// Get non-existent type
	apiSessions := sm.GetSessionsByType(SessionTypeAPI)
	if len(apiSessions) != 0 {
		t.Errorf("Expected 0 API sessions, got %d", len(apiSessions))
	}
}

func TestSessionManager_GetSessionsByUserID(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sm := NewSessionManager(logger)
	
	// Register sessions for different users
	sessions := []*SessionInfo{
		{
			ID:           "session-1",
			Type:         SessionTypeSignalR,
			UserID:       "user-1",
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
		},
		{
			ID:           "session-2",
			Type:         SessionTypeSignalR,
			UserID:       "user-1",
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
		},
		{
			ID:           "session-3",
			Type:         SessionTypeWebSocket,
			UserID:       "user-2",
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
		},
	}
	
	for _, session := range sessions {
		sm.RegisterSession(session)
	}
	
	// Get sessions for user-1
	user1Sessions := sm.GetSessionsByUserID("user-1")
	if len(user1Sessions) != 2 {
		t.Errorf("Expected 2 sessions for user-1, got %d", len(user1Sessions))
	}
	
	// Get sessions for user-2
	user2Sessions := sm.GetSessionsByUserID("user-2")
	if len(user2Sessions) != 1 {
		t.Errorf("Expected 1 session for user-2, got %d", len(user2Sessions))
	}
	
	// Get sessions for non-existent user
	user3Sessions := sm.GetSessionsByUserID("user-3")
	if len(user3Sessions) != 0 {
		t.Errorf("Expected 0 sessions for user-3, got %d", len(user3Sessions))
	}
}

func TestSessionManager_GetSessionCount(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sm := NewSessionManager(logger)
	
	// Initially no sessions
	if count := sm.GetSessionCount(); count != 0 {
		t.Errorf("Expected 0 sessions initially, got %d", count)
	}
	
	// Add some sessions
	sessions := []*SessionInfo{
		{
			ID:           "session-1",
			Type:         SessionTypeSignalR,
			UserID:       "user-1",
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
		},
		{
			ID:           "session-2",
			Type:         SessionTypeSignalR,
			UserID:       "user-2",
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
		},
	}
	
	for _, session := range sessions {
		sm.RegisterSession(session)
	}
	
	if count := sm.GetSessionCount(); count != 2 {
		t.Errorf("Expected 2 sessions, got %d", count)
	}
	
	// Remove one session
	sm.UnregisterSession("session-1")
	
	if count := sm.GetSessionCount(); count != 1 {
		t.Errorf("Expected 1 session after removal, got %d", count)
	}
}

func TestSessionManager_GetSessionMetrics(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sm := NewSessionManager(logger)
	
	// Add sessions with different ages
	oldTime := time.Now().Add(-30 * time.Minute)
	newTime := time.Now().Add(-5 * time.Minute)
	
	sessions := []*SessionInfo{
		{
			ID:           "old-session",
			Type:         SessionTypeSignalR,
			UserID:       "user-1",
			CreatedAt:    oldTime,
			LastActivity: oldTime,
		},
		{
			ID:           "new-session",
			Type:         SessionTypeWebSocket,
			UserID:       "user-2",
			CreatedAt:    newTime,
			LastActivity: newTime,
		},
	}
	
	for _, session := range sessions {
		sm.RegisterSession(session)
	}
	
	metrics := sm.GetSessionMetrics()
	
	// Check total sessions
	if totalSessions := metrics["total_sessions"]; totalSessions != 2 {
		t.Errorf("Expected 2 total sessions, got %v", totalSessions)
	}
	
	// Check by type
	byType := metrics["by_type"].(map[string]int)
	if byType["signalr"] != 1 {
		t.Errorf("Expected 1 SignalR session, got %d", byType["signalr"])
	}
	if byType["websocket"] != 1 {
		t.Errorf("Expected 1 WebSocket session, got %d", byType["websocket"])
	}
	
	// Check oldest session
	oldestSession := metrics["oldest_session"]
	if oldestSession.(time.Time).IsZero() {
		t.Error("Oldest session should not be zero time")
	}
	
	// Check average age
	avgAge := metrics["average_age"].(time.Duration)
	if avgAge <= 0 {
		t.Error("Average age should be positive")
	}
}

func TestSessionManager_CleanupInactiveSessions(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sm := NewSessionManager(logger)
	
	// Add an old session that should be cleaned up
	oldTime := time.Now().Add(-35 * time.Minute) // Older than 30 minute threshold
	newTime := time.Now().Add(-5 * time.Minute)  // Within threshold
	
	sessions := []*SessionInfo{
		{
			ID:           "old-session",
			Type:         SessionTypeSignalR,
			UserID:       "user-1",
			CreatedAt:    oldTime,
			LastActivity: oldTime,
		},
		{
			ID:           "new-session",
			Type:         SessionTypeSignalR,
			UserID:       "user-2",
			CreatedAt:    newTime,
			LastActivity: newTime,
		},
	}
	
	for _, session := range sessions {
		sm.RegisterSession(session)
	}
	
	// Verify both sessions exist
	if count := sm.GetSessionCount(); count != 2 {
		t.Errorf("Expected 2 sessions before cleanup, got %d", count)
	}
	
	// Run cleanup
	sm.cleanupInactiveSessions()
	
	// Verify old session was removed
	if count := sm.GetSessionCount(); count != 1 {
		t.Errorf("Expected 1 session after cleanup, got %d", count)
	}
	
	// Verify the correct session remains
	_, exists := sm.GetSession("new-session")
	if !exists {
		t.Error("New session should still exist after cleanup")
	}
	
	_, exists = sm.GetSession("old-session")
	if exists {
		t.Error("Old session should be removed after cleanup")
	}
}

func TestSessionManager_GetActiveSessions(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)
	
	sm := NewSessionManager(logger)
	
	session := &SessionInfo{
		ID:           "test-session-1",
		Type:         SessionTypeSignalR,
		UserID:       "user-1",
		CreatedAt:    time.Now(),
		LastActivity: time.Now(),
	}
	
	sm.RegisterSession(session)
	
	// Get active sessions
	activeSessions := sm.GetActiveSessions()
	
	if len(activeSessions) != 1 {
		t.Errorf("Expected 1 active session, got %d", len(activeSessions))
	}
	
	if activeSessions["test-session-1"] == nil {
		t.Error("Session should be in active sessions map")
	}
	
	// Verify it's a copy (modifying shouldn't affect original)
	delete(activeSessions, "test-session-1")
	
	// Original should still exist
	_, exists := sm.GetSession("test-session-1")
	if !exists {
		t.Error("Original session should still exist after modifying returned map")
	}
}