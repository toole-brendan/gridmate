package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gridmate/backend/internal/services"
	"github.com/sirupsen/logrus"
)

type MetricsHandler struct {
	sessionManager *services.SessionManager
	logger         *logrus.Logger
}

func NewMetricsHandler(sessionManager *services.SessionManager, logger *logrus.Logger) *MetricsHandler {
	return &MetricsHandler{
		sessionManager: sessionManager,
		logger:         logger,
	}
}

func (h *MetricsHandler) GetSessionMetrics(w http.ResponseWriter, r *http.Request) {
	sessions := h.sessionManager.GetActiveSessions()
	
	metrics := map[string]interface{}{
		"total_sessions": len(sessions),
		"by_type":        map[string]int{},
		"oldest_session": nil,
		"average_age":    0,
		"active_users":   map[string]int{},
		"session_details": []map[string]interface{}{},
	}
	
	if len(sessions) == 0 {
		h.sendJSONResponse(w, http.StatusOK, metrics)
		return
	}
	
	// Calculate metrics
	typeCount := make(map[string]int)
	userCount := make(map[string]int)
	var totalAge time.Duration
	var oldestSession *services.SessionInfo
	
	for _, session := range sessions {
		// Type counts
		typeCount[string(session.Type)]++
		
		// User counts
		userCount[session.UserID]++
		
		// Age calculations
		age := time.Since(session.CreatedAt)
		totalAge += age
		
		if oldestSession == nil || session.CreatedAt.Before(oldestSession.CreatedAt) {
			oldestSession = session
		}
		
		// Session details
		sessionDetail := map[string]interface{}{
			"id":            session.ID,
			"type":          session.Type,
			"user_id":       session.UserID,
			"created_at":    session.CreatedAt,
			"last_activity": session.LastActivity,
			"age_minutes":   int(age.Minutes()),
			"inactive_minutes": int(time.Since(session.LastActivity).Minutes()),
		}
		
		if session.Metadata != nil {
			sessionDetail["metadata"] = session.Metadata
		}
		
		metrics["session_details"] = append(metrics["session_details"].([]map[string]interface{}), sessionDetail)
	}
	
	// Set calculated metrics
	metrics["by_type"] = typeCount
	metrics["active_users"] = userCount
	metrics["average_age"] = int(totalAge.Minutes()) / len(sessions)
	
	if oldestSession != nil {
		metrics["oldest_session"] = map[string]interface{}{
			"id":         oldestSession.ID,
			"created_at": oldestSession.CreatedAt,
			"age_minutes": int(time.Since(oldestSession.CreatedAt).Minutes()),
		}
	}
	
	h.sendJSONResponse(w, http.StatusOK, metrics)
}

func (h *MetricsHandler) GetHealthCheck(w http.ResponseWriter, r *http.Request) {
	sessions := h.sessionManager.GetActiveSessions()
	
	health := map[string]interface{}{
		"status":         "healthy",
		"timestamp":      time.Now().UTC(),
		"session_count":  len(sessions),
		"memory_usage":   "N/A", // Could add runtime memory stats
		"uptime":         "N/A", // Could add uptime calculation
	}
	
	// Add warning if too many sessions
	if len(sessions) > 100 {
		health["warnings"] = []string{
			"High number of active sessions detected",
		}
	}
	
	h.sendJSONResponse(w, http.StatusOK, health)
}

func (h *MetricsHandler) GetSessionDetails(w http.ResponseWriter, r *http.Request) {
	// Get session ID from query parameter
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		h.sendErrorResponse(w, http.StatusBadRequest, "session_id parameter required")
		return
	}
	
	session, exists := h.sessionManager.GetSession(sessionID)
	if !exists {
		h.sendErrorResponse(w, http.StatusNotFound, "Session not found")
		return
	}
	
	age := time.Since(session.CreatedAt)
	inactiveTime := time.Since(session.LastActivity)
	
	details := map[string]interface{}{
		"id":              session.ID,
		"type":            session.Type,
		"user_id":         session.UserID,
		"created_at":      session.CreatedAt,
		"last_activity":   session.LastActivity,
		"age_minutes":     int(age.Minutes()),
		"inactive_minutes": int(inactiveTime.Minutes()),
		"metadata":        session.Metadata,
	}
	
	h.sendJSONResponse(w, http.StatusOK, details)
}

func (h *MetricsHandler) GetSessionsByType(w http.ResponseWriter, r *http.Request) {
	sessionType := r.URL.Query().Get("type")
	if sessionType == "" {
		h.sendErrorResponse(w, http.StatusBadRequest, "type parameter required")
		return
	}
	
	sessions := h.sessionManager.GetSessionsByType(services.SessionType(sessionType))
	
	result := map[string]interface{}{
		"type":    sessionType,
		"count":   len(sessions),
		"sessions": sessions,
	}
	
	h.sendJSONResponse(w, http.StatusOK, result)
}

func (h *MetricsHandler) GetSessionsByUser(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		h.sendErrorResponse(w, http.StatusBadRequest, "user_id parameter required")
		return
	}
	
	sessions := h.sessionManager.GetSessionsByUserID(userID)
	
	result := map[string]interface{}{
		"user_id":  userID,
		"count":    len(sessions),
		"sessions": sessions,
	}
	
	h.sendJSONResponse(w, http.StatusOK, result)
}

func (h *MetricsHandler) sendJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.WithError(err).Error("Failed to encode JSON response")
	}
}

func (h *MetricsHandler) sendErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	errorResponse := map[string]interface{}{
		"error":     message,
		"timestamp": time.Now().UTC(),
	}
	
	h.sendJSONResponse(w, statusCode, errorResponse)
}