package handlers

import (
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"time"
	
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/models"
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
	EntityID    *string                `json:"entity_id,omitempty"`
	Description string                 `json:"description,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	IPAddress   *string                `json:"ip_address,omitempty"`
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
	
	// Note: WorkspaceID is in the request but not in the AuditLog model
	// This might be a future feature
	
	// Parse IP address
	var ipAddr *net.IP
	if ipAddress != "" {
		ip := net.ParseIP(ipAddress)
		ipAddr = &ip
	}
	
	// Create audit log entry
	auditLog := &models.AuditLog{
		ID:         uuid.New(),
		UserID:     &userID,
		Action:     req.Action,
		EntityType: &req.EntityType,
		Changes:    nil, // Will be set below after conversion
		IPAddress:  ipAddr,
		UserAgent:  &userAgent,
		CreatedAt:  time.Now(),
	}
	
	// Parse EntityID if provided
	if req.EntityID != "" {
		entID, err := uuid.Parse(req.EntityID)
		if err != nil {
			h.sendError(w, http.StatusBadRequest, "Invalid entity ID")
			return
		}
		auditLog.EntityID = &entID
	}
	
	// Convert metadata to JSON
	if req.Metadata != nil {
		metadataJSON, err := json.Marshal(req.Metadata)
		if err != nil {
			h.sendError(w, http.StatusBadRequest, "Invalid metadata")
			return
		}
		auditLog.Changes = metadataJSON
	}
	
	if err := h.repos.AuditLogs.Create(r.Context(), auditLog); err != nil {
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
		ID:        auditLog.ID.String(),
		CreatedAt: auditLog.CreatedAt,
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
	
	// workspaceIDStr := r.URL.Query().Get("workspace_id") // Not used in current model
	entityType := r.URL.Query().Get("entity_type")
	action := r.URL.Query().Get("action")
	
	// Build filter
	filter := &models.AuditLogFilter{
		UserID:     &userID,
		Limit:      pageSize,
		Offset:     (page - 1) * pageSize,
	}
	
	if entityType != "" {
		filter.EntityType = &entityType
	}
	if action != "" {
		filter.Action = &action
	}
	
	// Get logs and count separately
	logs, err := h.repos.AuditLogs.List(r.Context(), filter)
	if err != nil {
		h.logger.WithError(err).Error("Failed to get audit logs")
		h.sendError(w, http.StatusInternalServerError, "Failed to retrieve logs")
		return
	}
	
	totalCount, err := h.repos.AuditLogs.Count(r.Context(), filter)
	if err != nil {
		h.logger.WithError(err).Error("Failed to count audit logs")
		h.sendError(w, http.StatusInternalServerError, "Failed to count logs")
		return
	}
	
	// Convert to response format
	responseLogs := make([]AuditLog, len(logs))
	for i, log := range logs {
		auditLog := AuditLog{
			ID:        log.ID.String(),
			Action:    log.Action,
			Metadata:  nil, // Will be set below after parsing
			CreatedAt: log.CreatedAt,
		}
		
		// Parse metadata from Changes field
		if log.Changes != nil && len(log.Changes) > 0 {
			var metadata map[string]interface{}
			if err := json.Unmarshal(log.Changes, &metadata); err == nil {
				auditLog.Metadata = metadata
			}
		}
		
		// Handle optional fields
		if log.UserID != nil {
			auditLog.UserID = log.UserID.String()
		}
		if log.EntityType != nil {
			auditLog.EntityType = *log.EntityType
		}
		if log.EntityID != nil {
			id := log.EntityID.String()
			auditLog.EntityID = &id
		}
		if log.IPAddress != nil {
			ipStr := log.IPAddress.String()
			auditLog.IPAddress = &ipStr
		}
		if log.UserAgent != nil {
			auditLog.UserAgent = *log.UserAgent
		}
		
		responseLogs[i] = auditLog
	}
	
	h.sendJSON(w, http.StatusOK, GetLogsResponse{
		Logs:       responseLogs,
		TotalCount: int(totalCount),
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