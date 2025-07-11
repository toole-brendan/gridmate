package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/models"
	"github.com/gridmate/backend/internal/repository"
)

type APIKeyHandler struct {
	apiKeyRepo repository.APIKeyRepository
	logger     *logrus.Logger
}

func NewAPIKeyHandler(repos *repository.Repositories, logger *logrus.Logger) *APIKeyHandler {
	return &APIKeyHandler{
		apiKeyRepo: repos.APIKeys,
		logger:     logger,
	}
}

type CreateAPIKeyRequest struct {
	Name        string    `json:"name" validate:"required"`
	Description string    `json:"description,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

type CreateAPIKeyResponse struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	Key         string     `json:"key"` // Only returned on creation
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

type APIKeyListResponse struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

func (h *APIKeyHandler) Create(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	
	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid user ID")
		return
	}

	var req CreateAPIKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Generate API key
	plainKey := models.GenerateAPIKey()
	
	apiKey := &models.APIKey{
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
		ExpiresAt:   req.ExpiresAt,
	}

	// Create the API key (this will hash the plain key)
	if err := h.apiKeyRepo.Create(r.Context(), apiKey, plainKey); err != nil {
		h.logger.WithError(err).Error("Failed to create API key")
		h.sendError(w, http.StatusInternalServerError, "Failed to create API key")
		return
	}

	resp := CreateAPIKeyResponse{
		ID:          apiKey.ID.String(),
		Name:        apiKey.Name,
		Description: apiKey.Description,
		Key:         plainKey, // Return the plain key only on creation
		CreatedAt:   apiKey.CreatedAt,
		ExpiresAt:   apiKey.ExpiresAt,
	}

	h.sendJSON(w, http.StatusCreated, resp)
}

func (h *APIKeyHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	apiKeys, err := h.apiKeyRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		h.logger.WithError(err).Error("Failed to list API keys")
		h.sendError(w, http.StatusInternalServerError, "Failed to list API keys")
		return
	}

	// Convert to response format
	resp := make([]APIKeyListResponse, len(apiKeys))
	for i, key := range apiKeys {
		resp[i] = APIKeyListResponse{
			ID:          key.ID,
			Name:        key.Name,
			Description: key.Description,
			LastUsedAt:  key.LastUsedAt,
			CreatedAt:   key.CreatedAt,
			ExpiresAt:   key.ExpiresAt,
		}
	}

	h.sendJSON(w, http.StatusOK, resp)
}

func (h *APIKeyHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	keyID := mux.Vars(r)["id"]

	// Check if the key belongs to the user
	apiKey, err := h.apiKeyRepo.GetByID(r.Context(), keyID)
	if err != nil {
		h.sendError(w, http.StatusNotFound, "API key not found")
		return
	}

	if apiKey.UserID != userID {
		h.sendError(w, http.StatusForbidden, "Access denied")
		return
	}

	// Delete the key
	if err := h.apiKeyRepo.Delete(r.Context(), keyID); err != nil {
		h.logger.WithError(err).Error("Failed to delete API key")
		h.sendError(w, http.StatusInternalServerError, "Failed to delete API key")
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]string{"message": "API key deleted successfully"})
}

func (h *APIKeyHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.WithError(err).Error("Failed to encode response")
	}
}

func (h *APIKeyHandler) sendError(w http.ResponseWriter, status int, message string) {
	h.sendJSON(w, status, map[string]string{"error": message})
}