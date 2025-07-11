package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
	
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/repository"
)

type AuditHandler struct {
	repos  *repository.Repositories
	logger *logrus.Logger
}

func NewAuditHandler(repos *repository.Repositories, logger *logrus.Logger) *AuditHandler {
	return &AuditHandler{
		repos:  repos,
		logger: logger,
	}
}

type LogActionRequest struct {
	Action      string                 `json:"action" validate:"required"`
	EntityType  string                 `json:"entity_type" validate:"required"`
	EntityID    string                 `json:"entity_id"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	WorkspaceID string                 `json:"workspace_id"`
}

type LogActionResponse struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
}

type GetLogsResponse struct {
	Logs       []AuditLog `json:"logs"`
	TotalCount int        `json:"total_count"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
}

type AuditLog struct {
	ID          string                 `json:"id"`
	UserID      string                 `json:"user_id"`
	WorkspaceID string                 `json:"workspace_id,omitempty"`
	Action      string                 `json:"action"`
	EntityType  string                 `json:"entity_type"`
	EntityID    string                 `json:"entity_id,omitempty"`
	Description string                 `json:"description,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	IPAddress   string                 `json:"ip_address,omitempty"`
	UserAgent   string                 `json:"user_agent,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
}

// LogAction records an audit log entry
func (h *AuditHandler) LogAction(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	
	var req LogActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	
	// Get client info
	ipAddress := r.Header.Get("X-Real-IP")
	if ipAddress == "" {
		ipAddress = r.Header.Get("X-Forwarded-For")
		if ipAddress == "" {
			ipAddress = r.RemoteAddr
		}
	}
	userAgent := r.Header.Get("User-Agent")
	
	// Parse workspace ID if provided
	var workspaceID *uuid.UUID
	if req.WorkspaceID != "" {
		wsID, err := uuid.Parse(req.WorkspaceID)
		if err != nil {
			h.sendError(w, http.StatusBadRequest, "Invalid workspace ID")
			return
		}
		workspaceID = &wsID
	}
	
	// Create audit log entry
	auditID, err := h.repos.AuditLogs.LogAction(r.Context(), repository.AuditLogParams{
		UserID:      userID,
		WorkspaceID: workspaceID,
		Action:      req.Action,
		EntityType:  req.EntityType,
		EntityID:    req.EntityID,
		Description: req.Description,
		Metadata:    req.Metadata,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
	})
	
	if err != nil {
		h.logger.WithError(err).Error("Failed to create audit log")
		h.sendError(w, http.StatusInternalServerError, "Failed to log action")
		return
	}
	
	h.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"action":  req.Action,
		"entity":  req.EntityType,
	}).Info("Audit log created")
	
	h.sendJSON(w, http.StatusCreated, LogActionResponse{
		ID:        auditID.String(),
		CreatedAt: time.Now(),
	})
}

// GetLogs retrieves audit logs with pagination
func (h *AuditHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	
	// Parse query parameters
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	
	workspaceIDStr := r.URL.Query().Get("workspace_id")
	entityType := r.URL.Query().Get("entity_type")
	action := r.URL.Query().Get("action")
	
	// Build filter
	filter := repository.AuditLogFilter{
		UserID:     &userID,
		EntityType: entityType,
		Action:     action,
		Limit:      pageSize,
		Offset:     (page - 1) * pageSize,
	}
	
	if workspaceIDStr != "" {
		wsID, err := uuid.Parse(workspaceIDStr)
		if err != nil {
			h.sendError(w, http.StatusBadRequest, "Invalid workspace ID")
			return
		}
		filter.WorkspaceID = &wsID
	}
	
	// Get logs
	logs, totalCount, err := h.repos.Audit.GetLogs(r.Context(), filter)
	if err != nil {
		h.logger.WithError(err).Error("Failed to get audit logs")
		h.sendError(w, http.StatusInternalServerError, "Failed to retrieve logs")
		return
	}
	
	// Convert to response format
	responseLogs := make([]AuditLog, len(logs))
	for i, log := range logs {
		responseLogs[i] = AuditLog{
			ID:          log.ID.String(),
			UserID:      log.UserID.String(),
			Action:      log.Action,
			EntityType:  log.EntityType,
			EntityID:    log.EntityID,
			Description: log.Description,
			Metadata:    log.Metadata,
			IPAddress:   log.IPAddress,
			UserAgent:   log.UserAgent,
			CreatedAt:   log.CreatedAt,
		}
		
		if log.WorkspaceID != nil {
			responseLogs[i].WorkspaceID = log.WorkspaceID.String()
		}
	}
	
	h.sendJSON(w, http.StatusOK, GetLogsResponse{
		Logs:       responseLogs,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
	})
}

func (h *AuditHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *AuditHandler) sendError(w http.ResponseWriter, status int, message string) {
	h.sendJSON(w, status, map[string]string{"error": message})
}