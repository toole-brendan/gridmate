package services

import (
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

type SessionType string

const (
	SessionTypeSignalR   SessionType = "signalr"
	SessionTypeWebSocket SessionType = "websocket"
	SessionTypeAPI       SessionType = "api"
)

type SessionInfo struct {
	ID          string
	Type        SessionType
	UserID      string
	CreatedAt   time.Time
	LastActivity time.Time
	Metadata    map[string]interface{}
}

type SessionManager struct {
	sessions map[string]*SessionInfo
	mu       sync.RWMutex
	logger   *logrus.Logger
}

func NewSessionManager(logger *logrus.Logger) *SessionManager {
	sm := &SessionManager{
		sessions: make(map[string]*SessionInfo),
		logger:   logger,
	}
	go sm.cleanupLoop()
	return sm
}

func (sm *SessionManager) RegisterSession(session *SessionInfo) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.sessions[session.ID] = session
	sm.logger.WithFields(logrus.Fields{
		"session_id": session.ID,
		"type":       session.Type,
		"user_id":    session.UserID,
	}).Info("Session registered")
}

func (sm *SessionManager) UnregisterSession(sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	if session, ok := sm.sessions[sessionID]; ok {
		delete(sm.sessions, sessionID)
		sm.logger.WithFields(logrus.Fields{
			"session_id": sessionID,
			"type":       session.Type,
			"duration":   time.Since(session.CreatedAt),
		}).Info("Session unregistered")
	}
}

func (sm *SessionManager) UpdateActivity(sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	if session, ok := sm.sessions[sessionID]; ok {
		session.LastActivity = time.Now()
	}
}

func (sm *SessionManager) GetActiveSessions() map[string]*SessionInfo {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	
	// Return a copy to prevent external modifications
	copy := make(map[string]*SessionInfo)
	for k, v := range sm.sessions {
		copy[k] = v
	}
	return copy
}

func (sm *SessionManager) GetSession(sessionID string) (*SessionInfo, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	session, ok := sm.sessions[sessionID]
	return session, ok
}

func (sm *SessionManager) GetSessionsByType(sessionType SessionType) []*SessionInfo {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	
	var sessions []*SessionInfo
	for _, session := range sm.sessions {
		if session.Type == sessionType {
			sessions = append(sessions, session)
		}
	}
	return sessions
}

func (sm *SessionManager) GetSessionsByUserID(userID string) []*SessionInfo {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	
	var sessions []*SessionInfo
	for _, session := range sm.sessions {
		if session.UserID == userID {
			sessions = append(sessions, session)
		}
	}
	return sessions
}

func (sm *SessionManager) GetSessionCount() int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return len(sm.sessions)
}

func (sm *SessionManager) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		sm.cleanupInactiveSessions()
	}
}

func (sm *SessionManager) cleanupInactiveSessions() {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	
	cutoff := time.Now().Add(-30 * time.Minute)
	toRemove := []string{}
	
	for id, session := range sm.sessions {
		if session.LastActivity.Before(cutoff) {
			toRemove = append(toRemove, id)
		}
	}
	
	for _, id := range toRemove {
		delete(sm.sessions, id)
		sm.logger.WithField("session_id", id).Info("Cleaned up inactive session")
	}
	
	if len(toRemove) > 0 {
		sm.logger.WithField("count", len(toRemove)).Info("Cleaned up inactive sessions")
	}
}

// GetSessionMetrics returns metrics about active sessions
func (sm *SessionManager) GetSessionMetrics() map[string]interface{} {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	
	metrics := map[string]interface{}{
		"total_sessions": len(sm.sessions),
		"by_type":        map[string]int{},
		"oldest_session": time.Time{},
		"average_age":    time.Duration(0),
	}
	
	typeCount := make(map[SessionType]int)
	var totalAge time.Duration
	var oldestSession time.Time
	
	for _, session := range sm.sessions {
		typeCount[session.Type]++
		age := time.Since(session.CreatedAt)
		totalAge += age
		
		if oldestSession.IsZero() || session.CreatedAt.Before(oldestSession) {
			oldestSession = session.CreatedAt
		}
	}
	
	// Convert type counts to string keys
	for sessionType, count := range typeCount {
		metrics["by_type"].(map[string]int)[string(sessionType)] = count
	}
	
	if len(sm.sessions) > 0 {
		metrics["oldest_session"] = oldestSession
		metrics["average_age"] = totalAge / time.Duration(len(sm.sessions))
	}
	
	return metrics
}